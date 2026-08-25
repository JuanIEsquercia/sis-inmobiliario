import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import type { CashMovementSource } from "@/generated/prisma/client";

export async function getCashMovements(filters?: { source?: CashMovementSource }) {
  return withRetry(() =>
    prisma.cashMovement.findMany({
      where: filters?.source ? { source: filters.source } : undefined,
      orderBy: { occurredAt: "desc" },
      take: 200,
    })
  );
}

// Totales agrupados por fuente y moneda — nunca se suma ARS con USD.
export async function getCashMovementTotals() {
  return withRetry(() =>
    prisma.cashMovement.groupBy({ by: ["source", "currency"], _sum: { amount: true } })
  );
}

export async function getSales() {
  return withRetry(() =>
    prisma.sale.findMany({ include: { unit: true, agent: true }, orderBy: { closedAt: "desc" } })
  );
}

export async function getSaleById(id: number) {
  return withRetry(() =>
    prisma.sale.findUnique({ where: { id }, include: { unit: true, agent: true, createdBy: true } })
  );
}

export async function getAppraisals() {
  return withRetry(() =>
    prisma.appraisal.findMany({ include: { unit: true, agent: true }, orderBy: { completedAt: "desc" } })
  );
}

export async function getAppraisalById(id: number) {
  return withRetry(() =>
    prisma.appraisal.findUnique({ where: { id }, include: { unit: true, agent: true, createdBy: true } })
  );
}

export async function getRentalCommissions() {
  return withRetry(() =>
    prisma.rentalCommission.findMany({
      include: { contract: { include: { unit: true, tenant: true } }, agent: true },
      orderBy: { earnedAt: "desc" },
    })
  );
}

// Lista corta de staff activo para el <select> de vendedor/comisionista
// en Venta/Tasación/Comisión de alquiler. No hace falta un picker con
// búsqueda: la plantilla de personal es chica y cabe entera en un combo.
export async function getAgents() {
  return withRetry(() =>
    prisma.profile.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, username: true },
    })
  );
}
