import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { paymentTotal, paymentBreakdown } from "@/lib/alquileres";
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

export interface MonthlyCashLine {
  month: number;
  year: number;
  ingresosByCurrency: Map<string, number>;
  egresosByCurrency: Map<string, number>;
}

// Consolidado de varios meses seguidos, mes a mes — no un solo total
// tapando todo el semestre/año, que era la queja real: "el mes a mes es
// una vista muy limitada para tomar decisiones y hacer cálculos". Una
// sola consulta por tabla para todo el rango (no N consultas, una por
// mes) y se agrupa acá mismo por (año, mes).
export async function getCashSummaryByRange(startYear: number, startMonth: number, monthsCount: number): Promise<MonthlyCashLine[]> {
  const start = new Date(Date.UTC(startYear, startMonth - 1, 1));
  const end = new Date(Date.UTC(startYear, startMonth - 1 + monthsCount, 1));

  const [movements, expenses, agentPayments] = await withRetry(() =>
    Promise.all([
      prisma.cashMovement.findMany({
        where: { occurredAt: { gte: start, lt: end } },
        select: { occurredAt: true, amount: true, currency: true },
      }),
      prisma.expense.findMany({
        where: { occurredAt: { gte: start, lt: end } },
        select: { occurredAt: true, amount: true, currency: true },
      }),
      prisma.agentDebtPayment.findMany({
        where: { paidAt: { gte: start, lt: end } },
        select: { paidAt: true, amount: true, currency: true },
      }),
    ])
  );

  const lines: MonthlyCashLine[] = Array.from({ length: monthsCount }, (_, i) => {
    const d = new Date(Date.UTC(startYear, startMonth - 1 + i, 1));
    return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear(), ingresosByCurrency: new Map(), egresosByCurrency: new Map() };
  });
  const lineByKey = new Map(lines.map((l) => [`${l.year}-${l.month}`, l]));
  const keyFor = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;

  for (const m of movements) {
    const line = lineByKey.get(keyFor(m.occurredAt));
    if (!line) continue;
    line.ingresosByCurrency.set(m.currency, (line.ingresosByCurrency.get(m.currency) ?? 0) + Number(m.amount));
  }
  for (const e of expenses) {
    const line = lineByKey.get(keyFor(e.occurredAt));
    if (!line) continue;
    line.egresosByCurrency.set(e.currency, (line.egresosByCurrency.get(e.currency) ?? 0) + Number(e.amount));
  }
  for (const p of agentPayments) {
    const line = lineByKey.get(keyFor(p.paidAt));
    if (!line) continue;
    line.egresosByCurrency.set(p.currency, (line.egresosByCurrency.get(p.currency) ?? 0) + Number(p.amount));
  }

  return lines;
}

export interface ProjectionMonthLine {
  month: number;
  year: number;
  // Lo que van a pagar los inquilinos ese mes (alquiler + expensas +
  // agua + lo que se les liquide). NO es plata de la inmobiliaria: casi
  // todo se le entrega al propietario. Va como dato de volumen
  // administrado, nunca sumado al neto.
  cobranzaByCurrency: Map<string, number>;
  // Lo que de esa cobranza queda de verdad en la inmobiliaria: la
  // comisión de administración (% sobre el ítem de Alquiler, igual que
  // paymentBreakdown y que confirmarCobroComision, que es quien lo
  // registra en Caja cuando se cobra de verdad). ESTE es el ingreso.
  honorariosByCurrency: Map<string, number>;
  renovacionesByCurrency: Map<string, number>;
  gastosFijosByCurrency: Map<string, number>;
}

// Proyección plana hacia adelante — solo lo predecible: los honorarios
// de administración de los alquileres ya pactados (liquidaciones ya
// generadas para contratos ACTIVO), la comisión de renovación esperada
// de los contratos marcados "Sí" que vencen en ese mes (un mes de
// alquiler al monto vigente), y gastos fijos repetidos al último monto
// cargado. Ventas/Tasaciones/gastos variables NO se proyectan — no hay
// patrón del que estimar sin inventar un supuesto (ver comentario en
// ExpenseType).
//
// Ojo con la distinción cobranza/honorarios: antes esta función
// proyectaba el total que paga el inquilino como si fuera ingreso de la
// agencia, así que la proyección mostraba ~10x (1/comisión) lo que la
// agencia realmente iba a ganar, y no había forma de compararla contra
// el Consolidado, que solo cuenta CashMovement (es decir, honorarios).
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
        include: {
          // concept.isSystem hace falta para separar el ítem de Alquiler
          // (el único sobre el que se cobra comisión) del resto.
          items: { include: { concept: { select: { isSystem: true } } } },
          contract: { select: { managementFeePercent: true } },
        },
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
    const cobranzaByCurrency = new Map<string, number>();
    const honorariosByCurrency = new Map<string, number>();
    for (const p of payments) {
      if (p.periodMonth !== month || p.periodYear !== year) continue;
      cobranzaByCurrency.set(p.currency, (cobranzaByCurrency.get(p.currency) ?? 0) + paymentTotal(p.items));
      const { managementFee } = paymentBreakdown(p.items, p.contract.managementFeePercent);
      honorariosByCurrency.set(p.currency, (honorariosByCurrency.get(p.currency) ?? 0) + managementFee);
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

    return { month, year, cobranzaByCurrency, honorariosByCurrency, renovacionesByCurrency, gastosFijosByCurrency };
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

export async function getCashMovements(
  filters?: { source?: CashMovementSource },
  agentId: string | null = null
) {
  return withRetry(() =>
    prisma.cashMovement.findMany({
      where: {
        AND: [filters?.source ? { source: filters.source } : {}, cashMovementOwnerWhere(agentId)],
      },
      orderBy: { occurredAt: "desc" },
      take: 200,
    })
  );
}

// Totales agrupados por fuente y moneda — nunca se suma ARS con USD.
// Van con el mismo filtro que la lista: si los totales fueran de toda la
// inmobiliaria, delatarían justo lo que la lista esconde.
export async function getCashMovementTotals(agentId: string | null = null) {
  return withRetry(() =>
    prisma.cashMovement.groupBy({
      by: ["source", "currency"],
      where: cashMovementOwnerWhere(agentId),
      _sum: { amount: true },
    })
  );
}

// ---------------------------------------------------------------------
// Where-clauses de pertenencia. `agentId` null = sin restricción (ver
// cajaOwnerId). Un registro es tuyo si figurás como creador, vendedor o
// captador; las tasaciones no tienen captador y los movimientos de caja
// no tienen creador, así que cada uno tiene su variante.
// ---------------------------------------------------------------------
function saleOwnerWhere(agentId: string | null) {
  if (!agentId) return {};
  return { OR: [{ createdById: agentId }, { vendedorAgentId: agentId }, { captadorAgentId: agentId }] };
}

function rentalCommissionOwnerWhere(agentId: string | null) {
  if (!agentId) return {};
  return { OR: [{ createdById: agentId }, { vendedorAgentId: agentId }, { captadorAgentId: agentId }] };
}

function appraisalOwnerWhere(agentId: string | null) {
  if (!agentId) return {};
  return { OR: [{ createdById: agentId }, { vendedorAgentId: agentId }] };
}

// Un movimiento de caja no tiene creador propio: es tuyo si figurás como
// vendedor, o si es tuyo el registro que lo originó. Los movimientos de
// administración (source ADMINISTRACION, atados a una liquidación) entran
// por vendedorAgentId, que confirmarCobroComision copia del contrato.
function cashMovementOwnerWhere(agentId: string | null) {
  if (!agentId) return {};
  return {
    OR: [
      { vendedorAgentId: agentId },
      { sale: saleOwnerWhere(agentId) },
      { rentalCommission: rentalCommissionOwnerWhere(agentId) },
      { appraisal: appraisalOwnerWhere(agentId) },
      {
        commissionInstallment: {
          OR: [{ sale: saleOwnerWhere(agentId) }, { rentalCommission: rentalCommissionOwnerWhere(agentId) }],
        },
      },
    ],
  };
}

export async function getSales(query?: string, agentId: string | null = null) {
  const q = query?.trim();
  const busqueda = q
    ? {
        OR: [
          { unit: { propertyCode: { contains: q, mode: "insensitive" as const } } },
          { unit: { address: { contains: q, mode: "insensitive" as const } } },
          { seller: { firstName: { contains: q, mode: "insensitive" as const } } },
          { seller: { lastName: { contains: q, mode: "insensitive" as const } } },
          { buyer: { firstName: { contains: q, mode: "insensitive" as const } } },
          { buyer: { lastName: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  return withRetry(() =>
    prisma.sale.findMany({
      // AND de los dos filtros: la búsqueda no puede ampliar el alcance
      // (dos OR sueltos en el mismo where se pisarían).
      where: { AND: [busqueda, saleOwnerWhere(agentId)] },
      include: { unit: true, seller: true, buyer: true, vendedorAgent: true, captadorAgent: true },
      orderBy: { closedAt: "desc" },
    })
  );
}

// findFirst y no findUnique: hay que combinar el id con el filtro de
// pertenencia, igual que getContractById con el scope de cartera. Una
// venta ajena da `null` — como si no existiera, sin delatar que existe.
export async function getSaleById(id: number, agentId: string | null = null) {
  return withRetry(() =>
    prisma.sale.findFirst({
      where: { AND: [{ id }, saleOwnerWhere(agentId)] },
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

export async function getAppraisals(query?: string, agentId: string | null = null) {
  const q = query?.trim();
  const busqueda = q
    ? {
        OR: [
          { unit: { propertyCode: { contains: q, mode: "insensitive" as const } } },
          { unit: { address: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  return withRetry(() =>
    prisma.appraisal.findMany({
      where: { AND: [busqueda, appraisalOwnerWhere(agentId)] },
      include: { unit: true, vendedorAgent: true, cashMovement: true },
      orderBy: { completedAt: "desc" },
    })
  );
}

export async function getAppraisalById(id: number, agentId: string | null = null) {
  return withRetry(() =>
    prisma.appraisal.findFirst({
      where: { AND: [{ id }, appraisalOwnerWhere(agentId)] },
      include: { unit: true, vendedorAgent: true, createdBy: true, cashMovement: true },
    })
  );
}

// El listado solo necesita mostrar unidad, inquilino, agentes, estado
// de cobro y las cuotas — no la ficha completa de cada relación. Antes
// traía `unit`/`tenant`/`vendedorAgent`/`captadorAgent` enteros (con
// notas, teléfonos, fotos, timestamps...) de TODAS las comisiones de la
// historia, sin tope: medido, esta sola consulta tardaba 4,4 s. Con
// select acotado y tope de 200 (mismo criterio que getCashMovements y
// getExpenses) queda en una fracción, y el detalle completo sigue
// estando en getRentalCommissionById cuando se abre una.
export async function getRentalCommissions(agentId: string | null = null) {
  return withRetry(() =>
    prisma.rentalCommission.findMany({
      where: rentalCommissionOwnerWhere(agentId),
      include: {
        contract: {
          select: {
            id: true,
            unit: { select: { propertyCode: true, address: true } },
            tenant: { select: { firstName: true, lastName: true } },
          },
        },
        vendedorAgent: { select: { firstName: true, lastName: true } },
        captadorAgent: { select: { firstName: true, lastName: true } },
        cashMovement: { select: { id: true } },
        installments: { select: { id: true, status: true, numeroCuota: true, totalCuotas: true }, orderBy: { numeroCuota: "asc" } },
      },
      orderBy: { earnedAt: "desc" },
      take: 200,
    })
  );
}

export async function getRentalCommissionById(id: number, agentId: string | null = null) {
  return withRetry(() =>
    prisma.rentalCommission.findFirst({
      where: { AND: [{ id }, rentalCommissionOwnerWhere(agentId)] },
      include: {
        contract: { include: { unit: true, tenant: true } },
        vendedorAgent: true,
        captadorAgent: true,
        cashMovement: true,
        commissionScheme: { include: { agenteFijo: true } },
        installments: { orderBy: { numeroCuota: "asc" } },
      },
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
