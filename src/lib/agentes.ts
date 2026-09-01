import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import type { AgentDebtRole, AgentDebtSource } from "@/generated/prisma/client";

// Lo que se le debe a un agente NO es una tabla propia — son los montos
// que ya quedaron congelados por rol en RentalCommission/Sale/Appraisal
// al cargar cada operación. Cada entrada acá es una línea de esa deuda:
// de dónde viene, qué rol cumplió, cuánto, y cuánto de ESA línea puntual
// ya se le pagó (ver AgentDebtPayment, que se imputa a sourceType +
// sourceId + role, no a un total suelto).
export interface AgentDebtItem {
  sourceType: AgentDebtSource;
  sourceId: number;
  role: AgentDebtRole;
  sourceLabel: "Alquiler" | "Renovación" | "Venta" | "Tasación";
  roleLabel: "Vendedor" | "Captador" | "Agente fijo" | "Tasación";
  description: string;
  amount: number;
  currency: string;
  date: Date;
  href: string;
  paid: number;
  saldo: number;
}

// Exportada — la usa también el checkbox de selección en lote (mismo
// string tanto para armar el value del checkbox del lado del cliente
// como para volver a encontrar el item del lado del servidor).
export function debtKey(sourceType: AgentDebtSource, sourceId: number, role: AgentDebtRole): string {
  return `${sourceType}:${sourceId}:${role}`;
}

// La moneda de un pago a agente SIEMPRE es la de la operación que
// generó la deuda — no tiene sentido pagarle en una moneda distinta a
// la que se acordó la comisión. Por eso nunca se le pide al que carga
// el pago (ni se confía en un campo oculto del formulario, que además
// un cliente podría manipular): se resuelve acá, del lado del servidor,
// a partir de la operación real.
export async function resolveDebtSourceCurrency(sourceType: AgentDebtSource, sourceId: number): Promise<string> {
  switch (sourceType) {
    case "RENTAL_COMMISSION": {
      const rc = await prisma.rentalCommission.findUniqueOrThrow({ where: { id: sourceId }, select: { currency: true } });
      return rc.currency;
    }
    case "SALE": {
      const sale = await prisma.sale.findUniqueOrThrow({ where: { id: sourceId }, select: { currency: true } });
      return sale.currency;
    }
    case "APPRAISAL": {
      const appraisal = await prisma.appraisal.findUniqueOrThrow({ where: { id: sourceId }, select: { currency: true } });
      return appraisal.currency;
    }
  }
}

export async function getAgentDebtItems(agentId: string): Promise<AgentDebtItem[]> {
  const [
    rentalVendedor,
    rentalCaptador,
    rentalFijo,
    salesVendedor,
    salesCaptador,
    salesFijo,
    appraisals,
    payments,
  ] = await withRetry(() =>
    Promise.all([
      prisma.rentalCommission.findMany({
        where: { vendedorAgentId: agentId, vendedorAmount: { not: null } },
        include: { contract: { include: { unit: true } } },
      }),
      prisma.rentalCommission.findMany({
        where: { captadorAgentId: agentId, captadorAmount: { not: null } },
        include: { contract: { include: { unit: true } } },
      }),
      prisma.rentalCommission.findMany({
        where: { commissionScheme: { agenteFijoId: agentId }, agenteFijoAmount: { not: null } },
        include: { contract: { include: { unit: true } } },
      }),
      prisma.sale.findMany({
        where: { vendedorAgentId: agentId, vendedorAmount: { not: null } },
        include: { unit: true },
      }),
      prisma.sale.findMany({
        where: { captadorAgentId: agentId, captadorAmount: { not: null } },
        include: { unit: true },
      }),
      prisma.sale.findMany({
        where: { commissionScheme: { agenteFijoId: agentId }, agenteFijoAmount: { not: null } },
        include: { unit: true },
      }),
      prisma.appraisal.findMany({
        where: { vendedorAgentId: agentId, agentAmount: { not: null } },
        include: { unit: true },
      }),
      prisma.agentDebtPayment.findMany({
        where: { agentId },
        select: { sourceType: true, sourceId: true, role: true, amount: true },
      }),
    ])
  );

  const paidByKey = new Map<string, number>();
  for (const p of payments) {
    const key = debtKey(p.sourceType, p.sourceId, p.role);
    paidByKey.set(key, (paidByKey.get(key) ?? 0) + Number(p.amount));
  }

  const raw: Omit<AgentDebtItem, "paid" | "saldo">[] = [];

  for (const r of rentalVendedor) {
    raw.push({
      sourceType: "RENTAL_COMMISSION",
      sourceId: r.id,
      role: "VENDEDOR",
      sourceLabel: r.origin === "RENOVACION" ? "Renovación" : "Alquiler",
      roleLabel: "Vendedor",
      description: `${r.contract.unit.propertyCode} — ${r.contract.unit.address}`,
      amount: Number(r.vendedorAmount),
      currency: r.currency,
      date: r.earnedAt,
      href: `/backoffice/administraciones/${r.contractId}`,
    });
  }
  for (const r of rentalCaptador) {
    raw.push({
      sourceType: "RENTAL_COMMISSION",
      sourceId: r.id,
      role: "CAPTADOR",
      sourceLabel: r.origin === "RENOVACION" ? "Renovación" : "Alquiler",
      roleLabel: "Captador",
      description: `${r.contract.unit.propertyCode} — ${r.contract.unit.address}`,
      amount: Number(r.captadorAmount),
      currency: r.currency,
      date: r.earnedAt,
      href: `/backoffice/administraciones/${r.contractId}`,
    });
  }
  for (const r of rentalFijo) {
    raw.push({
      sourceType: "RENTAL_COMMISSION",
      sourceId: r.id,
      role: "AGENTE_FIJO",
      sourceLabel: r.origin === "RENOVACION" ? "Renovación" : "Alquiler",
      roleLabel: "Agente fijo",
      description: `${r.contract.unit.propertyCode} — ${r.contract.unit.address}`,
      amount: Number(r.agenteFijoAmount),
      currency: r.currency,
      date: r.earnedAt,
      href: `/backoffice/administraciones/${r.contractId}`,
    });
  }
  for (const s of salesVendedor) {
    raw.push({
      sourceType: "SALE",
      sourceId: s.id,
      role: "VENDEDOR",
      sourceLabel: "Venta",
      roleLabel: "Vendedor",
      description: `${s.unit.propertyCode} — ${s.unit.address}`,
      amount: Number(s.vendedorAmount),
      currency: s.currency,
      date: s.closedAt,
      href: `/backoffice/caja/ventas/${s.id}`,
    });
  }
  for (const s of salesCaptador) {
    raw.push({
      sourceType: "SALE",
      sourceId: s.id,
      role: "CAPTADOR",
      sourceLabel: "Venta",
      roleLabel: "Captador",
      description: `${s.unit.propertyCode} — ${s.unit.address}`,
      amount: Number(s.captadorAmount),
      currency: s.currency,
      date: s.closedAt,
      href: `/backoffice/caja/ventas/${s.id}`,
    });
  }
  for (const s of salesFijo) {
    raw.push({
      sourceType: "SALE",
      sourceId: s.id,
      role: "AGENTE_FIJO",
      sourceLabel: "Venta",
      roleLabel: "Agente fijo",
      description: `${s.unit.propertyCode} — ${s.unit.address}`,
      amount: Number(s.agenteFijoAmount),
      currency: s.currency,
      date: s.closedAt,
      href: `/backoffice/caja/ventas/${s.id}`,
    });
  }
  for (const a of appraisals) {
    raw.push({
      sourceType: "APPRAISAL",
      sourceId: a.id,
      role: "TASACION",
      sourceLabel: "Tasación",
      roleLabel: "Tasación",
      description: `${a.unit.propertyCode} — ${a.unit.address}`,
      amount: Number(a.agentAmount),
      currency: a.currency,
      date: a.completedAt,
      href: `/backoffice/caja/tasaciones/${a.id}`,
    });
  }

  return raw
    .map((item) => {
      const paid = paidByKey.get(debtKey(item.sourceType, item.sourceId, item.role)) ?? 0;
      return { ...item, paid, saldo: item.amount - paid };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getAgentDebtPayments(agentId: string) {
  return withRetry(() => prisma.agentDebtPayment.findMany({ where: { agentId }, orderBy: { paidAt: "desc" } }));
}

export interface AgentBalance {
  currency: string;
  debido: number;
  pagado: number;
  saldo: number;
}

export function summarizeAgentBalance(
  debtItems: { amount: number; currency: string }[],
  payments: { amount: unknown; currency: string }[]
): AgentBalance[] {
  const byCurrency = new Map<string, { debido: number; pagado: number }>();

  for (const item of debtItems) {
    const entry = byCurrency.get(item.currency) ?? { debido: 0, pagado: 0 };
    entry.debido += item.amount;
    byCurrency.set(item.currency, entry);
  }
  for (const p of payments) {
    const entry = byCurrency.get(p.currency) ?? { debido: 0, pagado: 0 };
    entry.pagado += Number(p.amount);
    byCurrency.set(p.currency, entry);
  }

  return [...byCurrency.entries()]
    .map(([currency, { debido, pagado }]) => ({ currency, debido, pagado, saldo: debido - pagado }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

export interface MonthFilter {
  month: number;
  year: number;
}

// Lo pagado en UN mes puntual, aparte del saldo (que siempre es
// acumulado — una deuda no "resetea" al cambiar de mes). Son dos
// preguntas distintas: "¿cuánto le pagamos en agosto?" no tiene nada
// que ver con "¿cuánto le debemos hoy?".
export function sumPaymentsByCurrency(
  payments: { amount: unknown; currency: string; paidAt: Date }[],
  monthFilter?: MonthFilter
): { currency: string; total: number }[] {
  const byCurrency = new Map<string, number>();
  for (const p of payments) {
    if (monthFilter && (p.paidAt.getUTCMonth() + 1 !== monthFilter.month || p.paidAt.getUTCFullYear() !== monthFilter.year)) {
      continue;
    }
    byCurrency.set(p.currency, (byCurrency.get(p.currency) ?? 0) + Number(p.amount));
  }
  return [...byCurrency.entries()]
    .map(([currency, total]) => ({ currency, total }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

// Para la ficha de un agente: mismo criterio, pero devuelve las filas en
// vez del total — la tabla "Pagos registrados" se filtra por mes sin
// tener que pedirle de nuevo a la base (ya se trajeron todos los pagos
// para calcular el saldo acumulado).
export function filterPaymentsByMonth<T extends { paidAt: Date }>(payments: T[], monthFilter?: MonthFilter): T[] {
  if (!monthFilter) return payments;
  return payments.filter(
    (p) => p.paidAt.getUTCMonth() + 1 === monthFilter.month && p.paidAt.getUTCFullYear() === monthFilter.year
  );
}

// Lista de agentes activos con su saldo por moneda, para el listado
// general — recorre el mismo cálculo por cada uno. `monthFilter` solo
// afecta a "pagadoEnMes" (para las tarjetas "cuánto le pagamos este
// mes") — el saldo/devengado siempre es acumulado.
export async function getAllAgentBalances(monthFilter?: MonthFilter) {
  const agents = await withRetry(() =>
    prisma.profile.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, username: true },
    })
  );

  const balances = await Promise.all(
    agents.map(async (agent) => {
      const [debtItems, payments] = await Promise.all([
        getAgentDebtItems(agent.id),
        getAgentDebtPayments(agent.id),
      ]);
      return {
        agent,
        balances: summarizeAgentBalance(debtItems, payments),
        pagadoEnMes: sumPaymentsByCurrency(payments, monthFilter),
      };
    })
  );

  return balances;
}
