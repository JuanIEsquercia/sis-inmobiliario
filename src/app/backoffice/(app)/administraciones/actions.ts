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
import type { DocumentType, Prisma } from "@/generated/prisma/client";

// Devuelve el id de un Client existente (si vino `${prefix}.clientId`
// desde ClientPicker) o crea uno nuevo con los campos `${prefix}.*`.
// Client es pura identidad/contacto — nunca guarda nada financiero, así
// que crearlo acá no arriesga mezclar mora/deuda entre roles.
async function resolveClient(
  tx: Prisma.TransactionClient,
  formData: FormData,
  prefix: string,
  roleLabel: string
): Promise<number> {
  const existingId = optionalInt(formData.get(`${prefix}.clientId`));
  if (existingId) return existingId;

  const birthDateRaw = optionalStr(formData.get(`${prefix}.birthDate`));

  const client = await tx.client.create({
    data: {
      firstName: requiredStr(formData.get(`${prefix}.firstName`), `Nombre (${roleLabel})`),
      lastName: requiredStr(formData.get(`${prefix}.lastName`), `Apellido (${roleLabel})`),
      docId: optionalStr(formData.get(`${prefix}.docId`)),
      phone: optionalStr(formData.get(`${prefix}.phone`)),
      email: optionalStr(formData.get(`${prefix}.email`)),
      birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
    },
  });
  return client.id;
}

// Mismo criterio que resolveClient, pero para Unit — con upsert por
// propertyCode como red de seguridad si se tipeó a mano un código que
// ya existe en vez de elegirlo con UnitPicker.
async function resolveUnit(tx: Prisma.TransactionClient, formData: FormData): Promise<number> {
  const existingId = optionalInt(formData.get("unit.id"));
  if (existingId) return existingId;

  const propertyCode = requiredStr(formData.get("unit.propertyCode"), "Código de propiedad");

  const unit = await tx.unit.upsert({
    where: { propertyCode },
    create: {
      propertyCode,
      address: requiredStr(formData.get("unit.address"), "Dirección de la unidad"),
      city: optionalStr(formData.get("unit.city")),
      propertyType: optionalStr(formData.get("unit.propertyType")),
    },
    update: {},
  });
  return unit.id;
}

function guarantorIndices(formData: FormData): number[] {
  const indices = new Set<number>();
  for (const key of formData.keys()) {
    const match = key.match(/^guarantors\.(\d+)\./);
    if (match) indices.add(Number(match[1]));
  }
  return [...indices].sort((a, b) => a - b);
}

export async function buscarClientes(query: string) {
  await requirePermission("administraciones.crear");
  const q = query.trim();
  if (q.length < 2) return [];

  return withRetry(() =>
    prisma.client.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { docId: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, docId: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 8,
    })
  );
}

export async function buscarUnidades(query: string) {
  await requirePermission("administraciones.crear");
  const q = query.trim();
  if (q.length < 2) return [];

  return withRetry(() =>
    prisma.unit.findMany({
      where: {
        OR: [
          { propertyCode: { contains: q, mode: "insensitive" } },
          { address: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, propertyCode: true, address: true, city: true, propertyType: true },
      orderBy: { propertyCode: "asc" },
      take: 8,
    })
  );
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
  const guarantorIdxs = guarantorIndices(formData);
  const renewedFromContractId = optionalInt(formData.get("renewedFromContractId"));
  const paymentAlias = optionalStr(formData.get("paymentAlias"));
  const paymentCBU = optionalStr(formData.get("paymentCBU"));

  const contract = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const ownerId = await resolveClient(tx, formData, "owner", "Propietario");
      const tenantId = await resolveClient(tx, formData, "tenant", "Inquilino");
      const unitId = await resolveUnit(tx, formData);

      const createdContract = await tx.contract.create({
        data: {
          unitId,
          ownerId,
          tenantId,
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
          paymentAlias,
          paymentCBU,
          renewedFromContractId,
          createdById: profile.id,
        },
      });

      if (guarantorIdxs.length > 0) {
        const guarantorClientIds = [];
        for (const i of guarantorIdxs) {
          guarantorClientIds.push(await resolveClient(tx, formData, `guarantors.${i}`, `Garante ${i + 1}`));
        }
        await tx.contractGuarantor.createMany({
          data: guarantorClientIds.map((clientId) => ({ contractId: createdContract.id, clientId })),
          skipDuplicates: true,
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

  // Los documentos se suben después de que el contrato ya quedó guardado
  // — un PDF que falla al subir nunca debe hacer perder el alta. Cada
  // archivo es opcional e independiente de los demás.
  const documentFields: { field: string; type: DocumentType }[] = [
    { field: "contratoFile", type: "CONTRATO" },
    { field: "dniInquilinoFile", type: "DNI_INQUILINO" },
    { field: "dniGaranteFile", type: "DNI_GARANTE" },
    { field: "otroFile", type: "OTRO" },
  ];

  for (const { field, type } of documentFields) {
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) continue;

    try {
      const { storagePath } = await uploadContractDocument(contract.id, file);
      await withRetry(() =>
        prisma.contractDocument.create({
          data: { contractId: contract.id, type, fileName: file.name, storagePath, uploadedById: profile.id },
        })
      );
    } catch (err) {
      console.error(`No se pudo subir ${field} para el contrato ${contract.id}:`, err);
    }
  }

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

export async function finalizarContrato(contractId: number, formData: FormData) {
  await requirePermission("administraciones.crear");

  const status = requiredStr(formData.get("status"), "Estado") as "FINALIZADO" | "RESCINDIDO";
  if (status !== "FINALIZADO" && status !== "RESCINDIDO") {
    throw new Error("Estado inválido");
  }
  const terminationReason = optionalStr(formData.get("terminationReason"));

  await withRetry(() =>
    prisma.contract.update({
      where: { id: contractId },
      data: { status, terminatedAt: new Date(), terminationReason },
    })
  );

  revalidatePath(`/backoffice/administraciones/${contractId}`);
  revalidatePath("/backoffice/administraciones");
}
