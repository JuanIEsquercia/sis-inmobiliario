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
        guarantors: true,
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
        contract: { include: { unit: true, tenant: true } },
        items: { include: { concept: true }, orderBy: { id: "asc" } },
      },
    })
  );
}

export function paymentTotal(items: { amount: unknown }[]): number {
  return items.reduce((sum, item) => sum + (item.amount ? Number(item.amount) : 0), 0);
}

export async function getConcepts() {
  return withRetry(() => prisma.concept.findMany({ orderBy: [{ isSystem: "desc" }, { name: "asc" }] }));
}

export async function getIndexTypes() {
  return withRetry(() => prisma.indexType.findMany({ orderBy: { code: "asc" } }));
}
