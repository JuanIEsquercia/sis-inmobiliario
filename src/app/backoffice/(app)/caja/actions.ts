"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission, requireAnyPermission } from "@/lib/auth";
import { resolveUnit } from "@/lib/backoffice-resolvers";
import { optionalDecimal, optionalStr, requiredDate, requiredDecimal, requiredStr } from "@/lib/form-utils";

export async function buscarUnidadesCaja(query: string) {
  await requireAnyPermission(["caja.ventas.crear", "caja.tasaciones.crear"]);
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

export async function crearVenta(formData: FormData) {
  const profile = await requirePermission("caja.ventas.crear");

  const saleAmount = optionalDecimal(formData.get("saleAmount"));
  const commissionAmount = requiredDecimal(formData.get("commissionAmount"), "Comisión de venta");
  const currency = requiredStr(formData.get("currency"), "Moneda");
  const closedAt = requiredDate(formData.get("closedAt"), "Fecha de cierre");
  const agentId = requiredStr(formData.get("agentId"), "Vendedor/comisionista");
  const notes = optionalStr(formData.get("notes"));

  const sale = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const unitId = await resolveUnit(tx, formData);
      const unit = await tx.unit.findUniqueOrThrow({ where: { id: unitId }, select: { propertyCode: true } });

      const created = await tx.sale.create({
        data: {
          unitId,
          saleAmount,
          commissionAmount,
          currency,
          closedAt,
          agentId,
          notes,
          createdById: profile.id,
        },
      });

      await tx.cashMovement.create({
        data: {
          source: "VENTA",
          description: `Venta — ${unit.propertyCode}`,
          amount: commissionAmount,
          currency,
          occurredAt: closedAt,
          saleId: created.id,
        },
      });

      return created;
    })
  );

  revalidatePath("/backoffice/caja");
  revalidatePath("/backoffice/caja/ventas");
  redirect(`/backoffice/caja/ventas/${sale.id}`);
}

export async function crearTasacion(formData: FormData) {
  const profile = await requirePermission("caja.tasaciones.crear");

  const amount = requiredDecimal(formData.get("amount"), "Monto de tasación");
  const currency = requiredStr(formData.get("currency"), "Moneda");
  const completedAt = requiredDate(formData.get("completedAt"), "Fecha de tasación");
  const agentId = requiredStr(formData.get("agentId"), "Tasador/comisionista");
  const notes = optionalStr(formData.get("notes"));

  const appraisal = await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const unitId = await resolveUnit(tx, formData);
      const unit = await tx.unit.findUniqueOrThrow({ where: { id: unitId }, select: { propertyCode: true } });

      const created = await tx.appraisal.create({
        data: { unitId, amount, currency, completedAt, agentId, notes, createdById: profile.id },
      });

      await tx.cashMovement.create({
        data: {
          source: "TASACION",
          description: `Tasación — ${unit.propertyCode}`,
          amount,
          currency,
          occurredAt: completedAt,
          appraisalId: created.id,
        },
      });

      return created;
    })
  );

  revalidatePath("/backoffice/caja");
  revalidatePath("/backoffice/caja/tasaciones");
  redirect(`/backoffice/caja/tasaciones/${appraisal.id}`);
}

// Invocada desde la ficha de Contrato (no tiene página propia de alta —
// está atada 1:1 a un contrato existente). El @unique en
// RentalCommission.contractId actúa como guarda contra doble alta.
export async function crearComisionAlquiler(contractId: number, formData: FormData) {
  const profile = await requirePermission("caja.comisiones.crear");

  const amount = requiredDecimal(formData.get("amount"), "Comisión de alquiler");
  const currency = requiredStr(formData.get("currency"), "Moneda");
  const earnedAt = requiredDate(formData.get("earnedAt"), "Fecha");
  const agentId = requiredStr(formData.get("agentId"), "Vendedor/comisionista");
  const notes = optionalStr(formData.get("notes"));

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const created = await tx.rentalCommission.create({
        data: { contractId, amount, currency, earnedAt, agentId, notes, createdById: profile.id },
      });

      await tx.cashMovement.create({
        data: {
          source: "COMISION_ALQUILER",
          description: `Comisión de alquiler — contrato #${contractId}`,
          amount,
          currency,
          occurredAt: earnedAt,
          rentalCommissionId: created.id,
        },
      });
    })
  );

  revalidatePath(`/backoffice/administraciones/${contractId}`);
  revalidatePath("/backoffice/caja");
  revalidatePath("/backoffice/caja/comisiones");
}
