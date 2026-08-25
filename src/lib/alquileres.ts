import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";

export async function getContracts() {
  return withRetry(() =>
    prisma.contract.findMany({
      include: { unit: true, owner: true, tenant: true },
      orderBy: { createdAt: "desc" },
    })
  );
}

export interface PaymentPeriod {
  periodMonth: number;
  periodYear: number;
  dueDate: Date;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export function computeEndDate(startDate: Date, durationMonths: number): Date {
  return addMonths(startDate, durationMonths);
}

// Un período por cada mes de la duración del contrato (un contrato de
// 12 meses genera exactamente 12 liquidaciones, no 13 — el mes de
// endDate ya es el día de entrega, no un mes más de ocupación), con
// vencimiento en el mismo día del mes que el inicio.
export function buildPaymentSchedule(startDate: Date, durationMonths: number): PaymentPeriod[] {
  const entries: PaymentPeriod[] = [];
  const dueDay = startDate.getUTCDate();
  const startMonth = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));

  for (let i = 0; i < durationMonths; i++) {
    const cursor = new Date(startMonth);
    cursor.setUTCMonth(cursor.getUTCMonth() + i);

    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    entries.push({
      periodMonth: month + 1,
      periodYear: year,
      dueDate: new Date(Date.UTC(year, month, Math.min(dueDay, daysInMonth))),
    });
  }

  return entries;
}

export async function getContractById(id: number) {
  return withRetry(() =>
    prisma.contract.findUnique({
      where: { id },
      include: {
        unit: true,
        owner: true,
        tenant: true,
        guarantors: { include: { client: true } },
        indexType: true,
        concepts: { include: { concept: true } },
        documents: { include: { uploadedBy: { select: { username: true } } }, orderBy: { createdAt: "desc" } },
        payments: {
          orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
          include: { items: { include: { concept: true } } },
        },
        indexations: { orderBy: { appliedAt: "desc" }, include: { indexType: true } },
      },
    })
  );
}

export async function getPaymentById(id: number) {
  return withRetry(() =>
    prisma.payment.findUnique({
      where: { id },
      include: {
        contract: { include: { unit: true, tenant: true, owner: true } },
        items: { include: { concept: true }, orderBy: { id: "asc" } },
      },
    })
  );
}

export function paymentTotal(items: { amount: unknown }[]): number {
  return items.reduce((sum, item) => sum + (item.amount ? Number(item.amount) : 0), 0);
}

export interface PaymentBreakdown {
  total: number;
  managementFee: number;
  netForOwner: number;
}

// La comisión de administración se calcula solo sobre el ítem de
// Alquiler (concept.isSystem), nunca sobre expensas/agua/etc.
export function paymentBreakdown(
  items: { amount: unknown; concept: { isSystem: boolean } }[],
  feePercent: unknown
): PaymentBreakdown {
  const total = paymentTotal(items);
  const rentItem = items.find((i) => i.concept.isSystem);
  const rentAmount = rentItem?.amount ? Number(rentItem.amount) : 0;
  const managementFee = rentAmount * (Number(feePercent) / 100);
  return { total, managementFee, netForOwner: total - managementFee };
}

// Contratos activos cuya próxima indexación cae dentro de los próximos
// `withinDays` días (por defecto 30), ordenados por fecha más próxima.
export async function getContractsDueForIndexation(withinDays = 30) {
  // Arranca del inicio del día de hoy, no de la hora exacta actual — una
  // actualización que vence "hoy" no puede quedar afuera solo porque ya
  // pasó la medianoche.
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const limit = new Date(startOfToday);
  limit.setUTCDate(limit.getUTCDate() + withinDays);

  return withRetry(() =>
    prisma.contract.findMany({
      where: { status: "ACTIVO", nextIndexationDueAt: { gte: startOfToday, lte: limit } },
      include: { unit: true, tenant: true, owner: true, indexType: true },
      orderBy: { nextIndexationDueAt: "asc" },
    })
  );
}

// Todas las liquidaciones de un período (mes/año), cruzando todos los
// contratos — para la vista mensual de Liquidaciones.
export async function getPaymentsForPeriod(periodMonth: number, periodYear: number) {
  return withRetry(() =>
    prisma.payment.findMany({
      where: { periodMonth, periodYear },
      include: {
        items: { include: { concept: true } },
        contract: { include: { unit: true, owner: true } },
      },
      orderBy: { contractId: "asc" },
    })
  );
}

export async function getConcepts() {
  return withRetry(() => prisma.concept.findMany({ orderBy: [{ isSystem: "desc" }, { name: "asc" }] }));
}

export async function getIndexTypes() {
  return withRetry(() => prisma.indexType.findMany({ orderBy: { code: "asc" } }));
}

export interface ContractPunctuality {
  totalPayments: number;
  paidOnTime: number;
  paidLate: number;
  overdue: number;
  pending: number;
}

function summarizePunctuality(
  payments: { status: string; dueDate: Date; paidAt: Date | null }[]
): ContractPunctuality {
  let paidOnTime = 0;
  let paidLate = 0;
  let overdue = 0;
  let pending = 0;

  for (const p of payments) {
    if (p.status === "PAGADO") {
      if (p.paidAt && p.paidAt <= p.dueDate) paidOnTime++;
      else paidLate++;
    } else if (p.status === "ATRASADO") {
      overdue++;
    } else {
      pending++;
    }
  }

  return { totalPayments: payments.length, paidOnTime, paidLate, overdue, pending };
}

export async function listClients(query?: string) {
  const q = query?.trim();
  return withRetry(() =>
    prisma.client.findMany({
      where: q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { docId: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 50,
    })
  );
}

// Ficha de cliente: tres bloques separados y sin cruzarse. La
// puntualidad de "como inquilino" se calcula solo con los pagos de esos
// contratos — nunca se guarda en Client ni se mezcla con su rol de
// propietario/garante en otro contrato.
export async function getClientById(id: number) {
  const client = await withRetry(() =>
    prisma.client.findUnique({
      where: { id },
      include: {
        contractsAsTenant: {
          include: {
            unit: true,
            owner: true,
            payments: { select: { status: true, dueDate: true, paidAt: true } },
          },
          orderBy: { startDate: "desc" },
        },
        contractsAsOwner: {
          include: { unit: true, tenant: true },
          orderBy: { startDate: "desc" },
        },
        guarantorFor: {
          include: { contract: { include: { unit: true, tenant: true, owner: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    })
  );
  if (!client) return null;

  return {
    ...client,
    contractsAsTenant: client.contractsAsTenant.map((c) => ({
      ...c,
      punctuality: summarizePunctuality(c.payments),
    })),
  };
}

// Ficha de unidad: historial completo de contratos de esa propiedad
// (mismo código Adinco), sin importar cuántas veces se haya reutilizado.
export async function getUnitById(id: number) {
  return withRetry(() =>
    prisma.unit.findUnique({
      where: { id },
      include: {
        contracts: {
          include: { owner: true, tenant: true },
          orderBy: { startDate: "desc" },
        },
      },
    })
  );
}
