"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { addMonths, buildPaymentSchedule, computeEndDate } from "@/lib/alquileres";
import { uploadContractDocument } from "@/lib/supabase/storage";
import {
  optionalInt,
  optionalStr,
  requiredDate,
  requiredDecimal,
  requiredStr,
} from "@/lib/form-utils";
import type { DocumentType } from "@/generated/prisma/client";

interface GuarantorInput {
  firstName: string;
  lastName: string;
  docId: string | null;
  phone: string | null;
  email: string | null;
}

function parseGuarantors(formData: FormData): GuarantorInput[] {
  const indices = new Set<number>();
  for (const key of formData.keys()) {
    const match = key.match(/^guarantors\.(\d+)\./);
    if (match) indices.add(Number(match[1]));
  }

  return [...indices]
    .sort((a, b) => a - b)
    .map((i) => ({
      firstName: requiredStr(formData.get(`guarantors.${i}.firstName`), `Nombre del garante ${i + 1}`),
      lastName: requiredStr(formData.get(`guarantors.${i}.lastName`), `Apellido del garante ${i + 1}`),
      docId: optionalStr(formData.get(`guarantors.${i}.docId`)),
      phone: optionalStr(formData.get(`guarantors.${i}.phone`)),
      email: optionalStr(formData.get(`guarantors.${i}.email`)),
    }));
}

export async function createContract(formData: FormData) {
  const profile = await requirePermission("administraciones.crear");

  const startDate = requiredDate(formData.get("startDate"), "Fecha de inicio");
  const durationMonths = optionalInt(formData.get("durationMonths"));
  if (!durationMonths || durationMonths <= 0) throw new Error("La duración debe ser un número de meses mayor a 0");
  const endDate = computeEndDate(startDate, durationMonths);

  const rentAmount = requiredDecimal(formData.get("rentAmount"), "Monto del alquiler");
  const currency = requiredStr(formData.get("currency"), "Moneda");
  const managementFeePercent = requiredDecimal(formData.get("managementFeePercent"), "Comisión de administración");
  const indexationFrequencyMonths = optionalInt(formData.get("indexationFrequencyMonths"));
  const indexTypeId = optionalInt(formData.get("indexTypeId"));
  const conceptIds = formData
    .getAll("concepts")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));
  const guarantors = parseGuarantors(formData);

  const contract = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const owner = await tx.owner.create({
        data: {
          firstName: requiredStr(formData.get("ownerFirstName"), "Nombre del propietario"),
          lastName: requiredStr(formData.get("ownerLastName"), "Apellido del propietario"),
          email: optionalStr(formData.get("ownerEmail")),
          phone: optionalStr(formData.get("ownerPhone")),
          docId: optionalStr(formData.get("ownerDoc")),
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          firstName: requiredStr(formData.get("tenantFirstName"), "Nombre del inquilino"),
          lastName: requiredStr(formData.get("tenantLastName"), "Apellido del inquilino"),
          docId: requiredStr(formData.get("tenantDoc"), "DNI del inquilino"),
          birthDate: (() => {
            const s = optionalStr(formData.get("tenantBirthDate"));
            return s ? new Date(s) : null;
          })(),
          email: optionalStr(formData.get("tenantEmail")),
          phone: optionalStr(formData.get("tenantPhone")),
        },
      });

      const unit = await tx.unit.create({
        data: {
          address: requiredStr(formData.get("unitAddress"), "Dirección de la unidad"),
          city: optionalStr(formData.get("unitCity")),
          propertyType: optionalStr(formData.get("unitPropertyType")),
        },
      });

      const createdContract = await tx.contract.create({
        data: {
          unitId: unit.id,
          ownerId: owner.id,
          tenantId: tenant.id,
          startDate,
          durationMonths,
          endDate,
          rentAmount,
          currency,
          managementFeePercent,
          indexationFrequencyMonths,
          indexTypeId,
          nextIndexationDueAt: indexationFrequencyMonths ? addMonths(startDate, indexationFrequencyMonths) : null,
          notes: optionalStr(formData.get("notes")),
          createdById: profile.id,
        },
      });

      if (guarantors.length > 0) {
        await tx.guarantor.createMany({
          data: guarantors.map((g) => ({ ...g, contractId: createdContract.id })),
        });
      }

      if (conceptIds.length > 0) {
        await tx.contractConcept.createMany({
          data: conceptIds.map((conceptId) => ({ contractId: createdContract.id, conceptId })),
        });
      }

      const alquilerConcept = await tx.concept.findFirstOrThrow({ where: { isSystem: true } });
      const schedule = buildPaymentSchedule(startDate, durationMonths);

      // Todo en bloque (createMany + un findMany para recuperar los ids)
      // en vez de una fila a la vez: con contratos largos (24 meses x
      // varios conceptos) ir fila por fila en una sola transacción supera
      // el timeout dada la latencia que tiene esta conexión.
      await tx.payment.createMany({
        data: schedule.map((period) => ({ contractId: createdContract.id, ...period, currency })),
      });

      const createdPayments = await tx.payment.findMany({
        where: { contractId: createdContract.id },
        select: { id: true, periodYear: true, periodMonth: true },
      });
      const paymentIdByPeriod = new Map(
        createdPayments.map((p) => [`${p.periodYear}-${p.periodMonth}`, p.id])
      );

      const itemsData: { paymentId: number; conceptId: number; amount: string | null }[] = [];
      for (const period of schedule) {
        const paymentId = paymentIdByPeriod.get(`${period.periodYear}-${period.periodMonth}`)!;
        itemsData.push({ paymentId, conceptId: alquilerConcept.id, amount: rentAmount });
        for (const conceptId of conceptIds) {
          itemsData.push({ paymentId, conceptId, amount: null });
        }
      }
      await tx.paymentItem.createMany({ data: itemsData });

      return createdContract;
    },
    { timeout: 30000, maxWait: 15000 }
    )
  );

  revalidatePath("/backoffice/administraciones");
  redirect(`/backoffice/administraciones/${contract.id}`);
}

export async function crearConcepto(name: string) {
  await requirePermission("administraciones.crear");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("El nombre del concepto no puede estar vacío");

  const concept = await withRetry(() =>
    prisma.concept.upsert({ where: { name: trimmed }, create: { name: trimmed }, update: {} })
  );
  revalidatePath("/backoffice/administraciones/nuevo");
  return concept;
}

export async function crearIndexType(code: string) {
  await requirePermission("administraciones.crear");
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) throw new Error("El código del índice no puede estar vacío");

  const indexType = await withRetry(() =>
    prisma.indexType.upsert({ where: { code: trimmed }, create: { code: trimmed }, update: {} })
  );
  revalidatePath("/backoffice/administraciones/nuevo");
  return indexType;
}

export async function subirDocumento(contractId: number, formData: FormData) {
  const profile = await requirePermission("administraciones.crear");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Elegí un archivo PDF");
  const type = requiredStr(formData.get("type"), "Tipo de documento") as DocumentType;

  const { storagePath } = await uploadContractDocument(contractId, file);

  await withRetry(() =>
    prisma.contractDocument.create({
      data: { contractId, type, fileName: file.name, storagePath, uploadedById: profile.id },
    })
  );

  revalidatePath(`/backoffice/administraciones/${contractId}`);
}

export async function guardarLiquidacion(paymentId: number, formData: FormData) {
  await requirePermission("administraciones.pagos");

  const itemIds = formData
    .getAll("itemId")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));

  await withRetry(() =>
    prisma.$transaction(
      itemIds.map((itemId) =>
        prisma.paymentItem.update({
          where: { id: itemId },
          data: {
            amount: (() => {
              const raw = formData.get(`amount.${itemId}`);
              const s = typeof raw === "string" ? raw.trim() : "";
              return s.length > 0 ? s : null;
            })(),
            notes: optionalStr(formData.get(`notes.${itemId}`)),
          },
        })
      )
    )
  );

  const payment = await withRetry(() => prisma.payment.findUniqueOrThrow({ where: { id: paymentId } }));
  revalidatePath(`/backoffice/administraciones/${payment.contractId}/liquidaciones/${paymentId}`);
}

export async function marcarLiquidacionPagada(paymentId: number) {
  await requirePermission("administraciones.pagos");

  const payment = await withRetry(() =>
    prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { items: true } })
  );

  const total = payment.items.reduce((sum, item) => sum + (item.amount ? Number(item.amount) : 0), 0);

  await withRetry(() =>
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: "PAGADO", paidAt: new Date(), paidAmount: total },
    })
  );

  revalidatePath(`/backoffice/administraciones/${payment.contractId}/liquidaciones/${paymentId}`);
  revalidatePath(`/backoffice/administraciones/${payment.contractId}`);
}

export async function aplicarIndexacion(contractId: number, formData: FormData) {
  await requirePermission("administraciones.indexacion");

  const newAmount = requiredDecimal(formData.get("newAmount"), "Nuevo monto");
  const indexTypeId = optionalInt(formData.get("indexTypeId"));
  const notes = optionalStr(formData.get("notes"));

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUniqueOrThrow({ where: { id: contractId } });

      await tx.indexation.create({
        data: { contractId, previousAmount: contract.rentAmount, newAmount, indexTypeId, notes },
      });

      const now = new Date();
      await tx.contract.update({
        where: { id: contractId },
        data: {
          rentAmount: newAmount,
          lastIndexedAt: now,
          nextIndexationDueAt: contract.indexationFrequencyMonths
            ? addMonths(now, contract.indexationFrequencyMonths)
            : null,
        },
      });

      const alquilerConcept = await tx.concept.findFirstOrThrow({ where: { isSystem: true } });

      // Actualiza el monto de Alquiler solo en las liquidaciones futuras
      // y todavia pendientes — no toca lo ya pagado ni lo vencido.
      const futurePendingPayments = await tx.payment.findMany({
        where: { contractId, status: "PENDIENTE", dueDate: { gt: now } },
        select: { id: true },
      });

      await tx.paymentItem.updateMany({
        where: {
          conceptId: alquilerConcept.id,
          paymentId: { in: futurePendingPayments.map((p) => p.id) },
        },
        data: { amount: newAmount },
      });
    })
  );

  revalidatePath(`/backoffice/administraciones/${contractId}`);
}
