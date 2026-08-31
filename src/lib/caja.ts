import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { paymentTotal } from "@/lib/alquileres";
import type { CashMovementSource, CommissionSchemeType } from "@/generated/prisma/client";
import type { RepartoSchemeInfo } from "@/components/backoffice/RepartoPreview";

export async function getExpenseCategories() {
  return withRetry(() => prisma.expenseCategory.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }));
}

export async function getExpenses(filters?: { categoryId?: number }) {
  return withRetry(() =>
    prisma.expense.findMany({
      where: filters?.categoryId ? { categoryId: filters.categoryId } : undefined,
      include: { category: true },
      orderBy: { occurredAt: "desc" },
      take: 200,
    })
  );
}

// Todo lo que compone el neto real de un mes ya cerrado: ingresos
// confirmados (CashMovement), gastos cargados (Expense) y lo
// efectivamente pagado a agentes ese mes (AgentDebtPayment) — este
// último es un egreso real aunque no pase por Expense, para no
// cargarlo dos veces (ver comentario en el modelo ExpenseCategory). El
// armado de totales/neto por moneda queda del lado de la página, igual
// que en el resto de Caja.
export async function getMonthlyCashSummary(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const [movements, expenses, agentPayments] = await withRetry(() =>
    Promise.all([
      prisma.cashMovement.findMany({ where: { occurredAt: { gte: start, lt: end } } }),
      prisma.expense.findMany({ where: { occurredAt: { gte: start, lt: end } }, include: { category: true } }),
      prisma.agentDebtPayment.findMany({ where: { paidAt: { gte: start, lt: end } } }),
    ])
  );

  return { movements, expenses, agentPayments };
}

export interface ProjectionMonthLine {
  month: number;
  year: number;
  alquileresByCurrency: Map<string, number>;
  renovacionesByCurrency: Map<string, number>;
  gastosFijosByCurrency: Map<string, number>;
}

// Proyección plana hacia adelante — solo lo predecible: alquileres ya
// pactados (liquidaciones ya generadas para contratos ACTIVO), la
// comisión de renovación esperada de los contratos marcados "Sí" que
// vencen en ese mes (un mes de alquiler al monto vigente), y gastos
// fijos repetidos al último monto cargado. Ventas/Tasaciones/gastos
// variables NO se proyectan — no hay patrón del que estimar sin
// inventar un supuesto (ver comentario en ExpenseType).
export async function getProjection(monthsAhead: number): Promise<ProjectionMonthLine[]> {
  const now = new Date();
  const months = Array.from({ length: monthsAhead }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
  });

  const [payments, renewalContracts, fixedCategories] = await withRetry(() =>
    Promise.all([
      prisma.payment.findMany({
        where: {
          contract: { status: "ACTIVO" },
          OR: months.map((m) => ({ periodMonth: m.month, periodYear: m.year })),
        },
        include: { items: true },
      }),
      prisma.contract.findMany({
        where: { status: "ACTIVO", renewalCommissionExpected: true },
        select: { endDate: true, rentAmount: true, currency: true },
      }),
      prisma.expenseCategory.findMany({
        where: { type: "FIJO" },
        include: { expenses: { orderBy: { occurredAt: "desc" }, take: 1 } },
      }),
    ])
  );

  return months.map(({ month, year }) => {
    const alquileresByCurrency = new Map<string, number>();
    for (const p of payments) {
      if (p.periodMonth !== month || p.periodYear !== year) continue;
      alquileresByCurrency.set(p.currency, (alquileresByCurrency.get(p.currency) ?? 0) + paymentTotal(p.items));
    }

    const renovacionesByCurrency = new Map<string, number>();
    for (const c of renewalContracts) {
      if (c.endDate.getUTCMonth() + 1 === month && c.endDate.getUTCFullYear() === year) {
        renovacionesByCurrency.set(
          c.currency,
          (renovacionesByCurrency.get(c.currency) ?? 0) + Number(c.rentAmount)
        );
      }
    }

    const gastosFijosByCurrency = new Map<string, number>();
    for (const cat of fixedCategories) {
      const last = cat.expenses[0];
      if (!last) continue;
      gastosFijosByCurrency.set(last.currency, (gastosFijosByCurrency.get(last.currency) ?? 0) + Number(last.amount));
    }

    return { month, year, alquileresByCurrency, renovacionesByCurrency, gastosFijosByCurrency };
  });
}

// Fila única (id=1) — mismo patrón que SyncState: si todavía no se
// guardó ninguna, se usan los valores por defecto del schema sin
// crear la fila hasta que alguien la edite de verdad.
export async function getProjectionSettings() {
  const settings = await withRetry(() => prisma.projectionSettings.findUnique({ where: { id: 1 } }));
  return {
    indexationCorrectionMinPercent: settings ? Number(settings.indexationCorrectionMinPercent) : 7,
    indexationCorrectionMaxPercent: settings ? Number(settings.indexationCorrectionMaxPercent) : 10,
  };
}

// Vendedor/captador son opcionales: si no se asignó nadie, ese rol lo
// cumplió la propia inmobiliaria.
export function agentLabel(agent: { firstName: string | null; lastName: string | null } | null | undefined) {
  return agent ? `${agent.firstName} ${agent.lastName}` : "Inmobiliaria";
}

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
    prisma.sale.findMany({
      include: { unit: true, seller: true, buyer: true, vendedorAgent: true, captadorAgent: true },
      orderBy: { closedAt: "desc" },
    })
  );
}

export async function getSaleById(id: number) {
  return withRetry(() =>
    prisma.sale.findUnique({
      where: { id },
      include: {
        unit: true,
        seller: true,
        buyer: true,
        vendedorAgent: true,
        captadorAgent: true,
        createdBy: true,
        commissionScheme: { include: { agenteFijo: true } },
        installments: { orderBy: { numeroCuota: "asc" } },
      },
    })
  );
}

export async function getAppraisals() {
  return withRetry(() =>
    prisma.appraisal.findMany({
      include: { unit: true, agent: true, cashMovement: true },
      orderBy: { completedAt: "desc" },
    })
  );
}

export async function getAppraisalById(id: number) {
  return withRetry(() =>
    prisma.appraisal.findUnique({
      where: { id },
      include: { unit: true, agent: true, createdBy: true, cashMovement: true },
    })
  );
}

export async function getRentalCommissions() {
  return withRetry(() =>
    prisma.rentalCommission.findMany({
      include: {
        contract: { include: { unit: true, tenant: true } },
        vendedorAgent: true,
        captadorAgent: true,
        cashMovement: true,
      },
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

// Esquema de comisión vigente para Ventas/Alquileres: la versión más
// reciente para ese tipo. `null` si el admin todavía no cargó ninguna
// — las altas de Venta/Comisión de alquiler no pueden avanzar sin esto.
export async function getActiveCommissionScheme(type: CommissionSchemeType) {
  return withRetry(() =>
    prisma.commissionScheme.findFirst({
      where: { type },
      orderBy: { vigenteDesde: "desc" },
      include: { agenteFijo: true },
    })
  );
}

// Forma plana (sin Decimal ni relación completa) para pasarle a
// RepartoPreview/ComisionAlquilerFields como prop de client component.
export function toRepartoSchemeInfo(
  scheme: NonNullable<Awaited<ReturnType<typeof getActiveCommissionScheme>>>
): RepartoSchemeInfo {
  return {
    reservaPercent: Number(scheme.reservaPercent),
    agenteFijoPercent: Number(scheme.agenteFijoPercent),
    agenteFijoNombre: `${scheme.agenteFijo.firstName ?? ""} ${scheme.agenteFijo.lastName ?? ""}`.trim(),
    vendedorPercent: Number(scheme.vendedorPercent),
    captadorPercent: Number(scheme.captadorPercent),
  };
}

export async function getCommissionSchemeHistory(type: CommissionSchemeType) {
  return withRetry(() =>
    prisma.commissionScheme.findMany({
      where: { type },
      orderBy: { vigenteDesde: "desc" },
      include: { agenteFijo: true, createdBy: true },
    })
  );
}
