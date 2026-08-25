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

export interface PaymentScheduleEntry {
  periodMonth: number;
  periodYear: number;
  dueDate: Date;
  amount: string;
  currency: string;
}

// Un Payment por mes entre startDate y endDate (inclusive), con vencimiento
// en el mismo día del mes que el inicio del contrato.
export function buildPaymentSchedule(
  startDate: Date,
  endDate: Date,
  amount: string,
  currency: string
): PaymentScheduleEntry[] {
  const entries: PaymentScheduleEntry[] = [];
  const dueDay = startDate.getUTCDate();

  const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1));

  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    entries.push({
      periodMonth: month + 1,
      periodYear: year,
      dueDate: new Date(Date.UTC(year, month, Math.min(dueDay, daysInMonth))),
      amount,
      currency,
    });

    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
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
        payments: { orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }] },
        indexations: { orderBy: { appliedAt: "desc" } },
      },
    })
  );
}
