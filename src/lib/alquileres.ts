import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { contractGroupWhere, type ContractGroupScope } from "@/lib/auth";

// Propietario/inquilino son opcionales al cargar un contrato (ver
// comentario en el modelo) — mismo criterio que agentLabel (lib/caja.ts)
// para mostrar algo legible mientras se completan los datos reales.
export function clientLabel(client: { firstName: string; lastName: string } | null | undefined) {
  return client ? `${client.firstName} ${client.lastName}` : "A completar";
}

// Solo contratos administrados: una colocación pura (isAdministered
// false, sin liquidaciones ni indexación propia) no tiene nada que
// gestionar acá, vive únicamente en Caja > Comisión alquileres. Sigue
// existiendo como Contract (para el historial de la unidad) y su ficha
// sigue siendo accesible, solo no aparece en este listado.
export async function getContracts(scope: ContractGroupScope) {
  return withRetry(() =>
    prisma.contract.findMany({
      where: { isAdministered: true, ...(contractGroupWhere(scope) ?? {}) },
      include: { unit: true, owner: true, tenant: true, group: true },
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

// findFirst (no findUnique) porque necesita combinar el id con el
// filtro por scope — un contrato fuera de tu(s) grupo(s) da `null`,
// igual que si no existiera, para no filtrar si existe o no.
export async function getContractById(id: number, scope: ContractGroupScope) {
  const groupWhere = contractGroupWhere(scope);
  return withRetry(() =>
    prisma.contract.findFirst({
      // Una colocación sin administración (ver getContracts) no pertenece
      // a ninguna cartera — el scope por grupo solo tiene sentido para lo
      // que sí se administra, así que acá se ignora para cualquier
      // contrato con isAdministered false, sea cual sea su groupId (que
      // de hecho siempre nace null). Sin este bypass, un agente sin
      // administraciones.ver_todos jamás podría entrar a la ficha de una
      // colocación recién cargada — quedaba sin grupo y sin grupo es
      // invisible para su scope.
      where: { id, ...(groupWhere ? { OR: [{ isAdministered: false }, groupWhere] } : {}) },
      include: {
        unit: true,
        owner: true,
        tenant: true,
        group: true,
        guarantors: { include: { client: true } },
        vendedorAgent: true,
        captadorAgent: true,
        rentalCommission: { include: { vendedorAgent: true, captadorAgent: true } },
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
        partialPayments: { orderBy: { paidAt: "asc" } },
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
export async function getContractsDueForIndexation(scope: ContractGroupScope, withinDays = 30) {
  // Arranca del inicio del día de hoy, no de la hora exacta actual — una
  // actualización que vence "hoy" no puede quedar afuera solo porque ya
  // pasó la medianoche.
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const limit = new Date(startOfToday);
  limit.setUTCDate(limit.getUTCDate() + withinDays);

  return withRetry(() =>
    prisma.contract.findMany({
      where: {
        status: "ACTIVO",
        nextIndexationDueAt: { gte: startOfToday, lte: limit },
        ...(contractGroupWhere(scope) ?? {}),
      },
      include: { unit: true, tenant: true, owner: true, indexType: true },
      orderBy: { nextIndexationDueAt: "asc" },
    })
  );
}

// Contratos activos cuya fecha de fin cae dentro de los próximos
// `withinDays` días (por defecto 60) — la lista de "por vencer", que es
// DISTINTA de getContractsDueForIndexation: un contrato puede tener su
// próxima actualización de alquiler pronto y aun así faltarle varios
// cortes antes del vencimiento real. Es donde conviene decidir/revisar
// si la eventual renovación va a cobrar comisión (ver
// actualizarRenovacionEsperada).
export async function getContractsNearingEnd(scope: ContractGroupScope, withinDays = 60) {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const limit = new Date(startOfToday);
  limit.setUTCDate(limit.getUTCDate() + withinDays);

  return withRetry(() =>
    prisma.contract.findMany({
      where: {
        status: "ACTIVO",
        endDate: { gte: startOfToday, lte: limit },
        ...(contractGroupWhere(scope) ?? {}),
      },
      include: { unit: true, tenant: true, owner: true },
      orderBy: { endDate: "asc" },
    })
  );
}

// Todas las liquidaciones de un período (mes/año), cruzando todos los
// contratos — para la vista mensual de Liquidaciones.
export async function getPaymentsForPeriod(scope: ContractGroupScope, periodMonth: number, periodYear: number) {
  return withRetry(() =>
    prisma.payment.findMany({
      where: { periodMonth, periodYear, contract: contractGroupWhere(scope) ?? undefined },
      include: {
        items: { include: { concept: true } },
        contract: { include: { unit: true, owner: true, tenant: true } },
      },
      orderBy: { contractId: "asc" },
    })
  );
}

// Liquidaciones ya cobradas por el inquilino (status PAGADO) donde la
// inmobiliaria todavía no confirmó tener en mano su propia comisión de
// administración (sin CashMovement todavía) — para Caja > Administración.
// Sin filtro por grupo: Caja no está scopeada por cartera, la ve
// cualquiera con permiso de Caja.
export async function getPaymentsPendingFeeConfirmation() {
  return withRetry(() =>
    prisma.payment.findMany({
      where: { status: "PAGADO", cashMovement: null },
      include: {
        items: { include: { concept: true } },
        contract: { include: { unit: true, owner: true } },
      },
      orderBy: { paidAt: "desc" },
    })
  );
}

export interface MoraChargeSummary {
  contractId: number;
  propertyCode: string;
  address: string;
  tenantName: string;
  currency: string;
  total: number;
  periods: number;
}

// Cuánto se cargó en concepto de "Mora" (interés por atraso) por
// contrato, sumando el ítem de esa liquidación cada mes que se cargó —
// "Mora" no es un campo propio, es un Concept más (ver
// agregarConceptoLiquidacion), así que se identifica por nombre.
export async function getMoraChargesSummary(scope: ContractGroupScope) {
  const items = await withRetry(() =>
    prisma.paymentItem.findMany({
      where: {
        concept: { name: { equals: "Mora", mode: "insensitive" } },
        amount: { not: null },
        payment: { contract: contractGroupWhere(scope) ?? undefined },
      },
      include: {
        payment: { include: { contract: { include: { unit: true, tenant: true } } } },
      },
    })
  );

  const byContract = new Map<number, MoraChargeSummary>();
  for (const item of items) {
    const contract = item.payment.contract;
    const amount = Number(item.amount ?? 0);
    const existing = byContract.get(contract.id);
    if (existing) {
      existing.total += amount;
      existing.periods += 1;
    } else {
      byContract.set(contract.id, {
        contractId: contract.id,
        propertyCode: contract.unit.propertyCode,
        address: contract.unit.address,
        tenantName: clientLabel(contract.tenant),
        currency: item.payment.currency,
        total: amount,
        periods: 1,
      });
    }
  }

  const rows = [...byContract.values()].sort((a, b) => b.total - a.total);
  const totalsByCurrency = new Map<string, number>();
  for (const row of rows) {
    totalsByCurrency.set(row.currency, (totalsByCurrency.get(row.currency) ?? 0) + row.total);
  }

  return { rows, totalsByCurrency };
}

export interface OverduePayment {
  paymentId: number;
  contractId: number;
  propertyCode: string;
  address: string;
  tenantName: string;
  currency: string;
  periodMonth: number;
  periodYear: number;
  dueDate: Date;
  saldo: number;
  daysLate: number;
}

export type MoraBucket = "1-3" | "4-8" | "9-15" | "16-30" | "30+";

export function moraBucketFor(daysLate: number): MoraBucket {
  if (daysLate <= 3) return "1-3";
  if (daysLate <= 8) return "4-8";
  if (daysLate <= 15) return "9-15";
  if (daysLate <= 30) return "16-30";
  return "30+";
}

// Liquidaciones vencidas y todavía no cobradas del todo (ni Enviada,
// Parcial o incluso recién Pendiente si ya pasó la fecha) — la lista
// base para el seguimiento de morosidad: días de atraso a hoy,
// categorización por rango y promedio se calculan a partir de esto.
export async function getOverduePayments(scope: ContractGroupScope): Promise<OverduePayment[]> {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const payments = await withRetry(() =>
    prisma.payment.findMany({
      where: {
        status: { in: ["PENDIENTE", "ENVIADA", "PARCIAL"] },
        dueDate: { lt: startOfToday },
        contract: contractGroupWhere(scope) ?? undefined,
      },
      include: {
        items: true,
        contract: { include: { unit: true, tenant: true } },
      },
      orderBy: { dueDate: "asc" },
    })
  );

  return payments.map((p) => {
    const total = paymentTotal(p.items);
    const saldo = total - Number(p.paidAmount ?? 0);
    const daysLate = Math.round((startOfToday.getTime() - p.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      paymentId: p.id,
      contractId: p.contractId,
      propertyCode: p.contract.unit.propertyCode,
      address: p.contract.unit.address,
      tenantName: clientLabel(p.contract.tenant),
      currency: p.currency,
      periodMonth: p.periodMonth,
      periodYear: p.periodYear,
      dueDate: p.dueDate,
      saldo,
      daysLate,
    };
  });
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

// "Atrasado" no es un status guardado (nada lo asigna nunca — ver
// getOverduePayments, que ya calcula el atraso al vuelo desde dueDate en
// vez de depender de un status): acá se calcula igual, comparando contra
// hoy, para que el resumen de puntualidad del cliente no muestre "0
// atrasados" aunque tenga pagos vencidos sin cobrar.
function summarizePunctuality(
  payments: { status: string; dueDate: Date; paidAt: Date | null }[]
): ContractPunctuality {
  const now = new Date();
  let paidOnTime = 0;
  let paidLate = 0;
  let overdue = 0;
  let pending = 0;

  for (const p of payments) {
    if (p.status === "PAGADO") {
      if (p.paidAt && p.paidAt <= p.dueDate) paidOnTime++;
      else paidLate++;
    } else if (p.dueDate < now) {
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

// Catálogo de propiedades para el módulo de Historial — todas las
// unidades cargadas, tengan o no contrato activo hoy.
export async function getUnits() {
  return withRetry(() =>
    prisma.unit.findMany({
      include: { _count: { select: { contracts: true, sales: true, appraisals: true } } },
      orderBy: { propertyCode: "asc" },
    })
  );
}

// Ficha de unidad: trazabilidad completa de esa propiedad (mismo código
// Adinco) — contratos, ventas y tasaciones, sin importar cuántas veces
// se haya reutilizado la unidad a lo largo de los años.
export async function getUnitById(id: number) {
  return withRetry(() =>
    prisma.unit.findUnique({
      where: { id },
      include: {
        contracts: {
          include: { owner: true, tenant: true },
          orderBy: { startDate: "desc" },
        },
        sales: {
          include: { seller: true, buyer: true },
          orderBy: { closedAt: "desc" },
        },
        appraisals: {
          orderBy: { completedAt: "desc" },
        },
      },
    })
  );
}

export async function getContractGroups() {
  return withRetry(() =>
    prisma.contractGroup.findMany({
      include: { members: { include: { profile: true } }, _count: { select: { contracts: true } } },
      orderBy: { name: "asc" },
    })
  );
}

export async function getContractGroupById(id: number) {
  return withRetry(() =>
    prisma.contractGroup.findUnique({
      where: { id },
      include: {
        members: { include: { profile: true } },
        contracts: { include: { unit: true, tenant: true, owner: true }, orderBy: { createdAt: "desc" } },
      },
    })
  );
}
