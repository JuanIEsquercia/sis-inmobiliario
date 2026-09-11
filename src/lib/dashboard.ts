import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import {
  paymentTotal,
  getContractsDueForIndexation,
  getContractsNearingEnd,
  getOverduePayments,
} from "@/lib/alquileres";
import type { ContractGroupScope } from "@/lib/auth";
import { contractGroupWhere } from "@/lib/auth";

export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export interface PendingBucket {
  // Cantidad de filas cobrables (cuotas de venta/alquiler + tasaciones +
  // renovaciones, cada una con su propio vencimiento y su propia acción
  // de "confirmar cobro") — NO es lo mismo que cantidad de operaciones:
  // una sola venta con la comisión partida en 2 cuotas cuenta acá como
  // 2, porque son 2 cobros pendientes reales, cada uno por su lado.
  count: number;
  // Cantidad de ventas/comisiones de alquiler DISTINTAS detrás de esas
  // filas — para que "2 cuotas" no se lea como "2 ventas" cuando en
  // realidad es 1 venta partida en 2 pagos.
  operations: number;
  amounts: CurrencyAmount[];
}

function mergeAmounts(...groups: CurrencyAmount[][]): CurrencyAmount[] {
  const byCurrency = new Map<string, number>();
  for (const group of groups) {
    for (const { currency, amount } of group) {
      byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + amount);
    }
  }
  return [...byCurrency.entries()].map(([currency, amount]) => ({ currency, amount }));
}

// Comisión de alquiler tiene dos vías de cobro distintas según el
// origen (ver confirmarCobroComisionAlquiler / registrarCronogramaAlquiler):
// una colocación (origin ALQUILER) siempre pasa por CommissionInstallment
// (aunque sea una sola cuota "de contado"), una renovación (origin
// RENOVACION) se confirma de una sola vez, sin cuotas, directo sobre
// RentalCommission.cashMovement. Para el dashboard son la misma bolsa de
// plata ("comisión de alquiler pendiente"), así que se suman.
export async function getPendingCollectionsSummary(): Promise<{
  ventas: PendingBucket;
  alquileres: PendingBucket;
  tasaciones: PendingBucket;
}> {
  const [
    ventasCount,
    ventasSum,
    ventasSaleIds,
    alquilerInstCount,
    alquilerInstSum,
    alquilerCommissionIds,
    renovacionCount,
    renovacionSum,
    tasacionesCount,
    tasacionesSum,
  ] = await withRetry(() =>
    Promise.all([
      prisma.commissionInstallment.count({ where: { source: "VENTA", status: "PENDIENTE" } }),
      prisma.commissionInstallment.groupBy({
        by: ["currency"],
        where: { source: "VENTA", status: "PENDIENTE" },
        _sum: { amount: true },
      }),
      // distinct saleId detrás de esas cuotas — una venta con 2 cuotas
      // pendientes da 2 filas arriba pero 1 sola acá.
      prisma.commissionInstallment.groupBy({ by: ["saleId"], where: { source: "VENTA", status: "PENDIENTE" } }),
      prisma.commissionInstallment.count({ where: { source: "ALQUILER", status: "PENDIENTE" } }),
      prisma.commissionInstallment.groupBy({
        by: ["currency"],
        where: { source: "ALQUILER", status: "PENDIENTE" },
        _sum: { amount: true },
      }),
      prisma.commissionInstallment.groupBy({ by: ["rentalCommissionId"], where: { source: "ALQUILER", status: "PENDIENTE" } }),
      prisma.rentalCommission.count({ where: { origin: "RENOVACION", cashMovement: null } }),
      prisma.rentalCommission.groupBy({
        by: ["currency"],
        where: { origin: "RENOVACION", cashMovement: null },
        _sum: { amount: true },
      }),
      prisma.appraisal.count({ where: { cashMovement: null } }),
      prisma.appraisal.groupBy({
        by: ["currency"],
        where: { cashMovement: null },
        _sum: { amount: true },
      }),
    ])
  );

  const toAmounts = (rows: { currency: string; _sum: { amount: unknown } }[]): CurrencyAmount[] =>
    rows.map((r) => ({ currency: r.currency, amount: Number(r._sum.amount ?? 0) }));

  return {
    ventas: { count: ventasCount, operations: ventasSaleIds.length, amounts: toAmounts(ventasSum) },
    alquileres: {
      count: alquilerInstCount + renovacionCount,
      // Cada renovación ya es 1 operación propia (no tiene cuotas), se
      // suma directo a la cantidad de comisiones de colocación distintas.
      operations: alquilerCommissionIds.length + renovacionCount,
      amounts: mergeAmounts(toAmounts(alquilerInstSum), toAmounts(renovacionSum)),
    },
    // Tasaciones no tiene cuotas — acá count y operations siempre
    // coinciden, pero se completa igual para que el tipo sea uniforme.
    tasaciones: { count: tasacionesCount, operations: tasacionesCount, amounts: toAmounts(tasacionesSum) },
  };
}

export interface LoadedThisMonth {
  ventas: number;
  tasaciones: number;
  alquileresColocados: number;
  contratosAdministrados: number;
}

// "Cargado" = createdAt (cuándo entró al sistema), no la fecha de
// cierre/tasación/etc. — esos campos de negocio se pueden backdatear al
// cargar una operación vieja, y acá se quiere pulso de carga real, no de
// cuándo pasó el negocio.
export async function getLoadedThisMonth(): Promise<LoadedThisMonth> {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [ventas, tasaciones, alquileresColocados, contratosAdministrados] = await withRetry(() =>
    Promise.all([
      prisma.sale.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.appraisal.count({ where: { createdAt: { gte: startOfMonth } } }),
      // Solo colocación (origin ALQUILER) — una renovación no es una
      // propiedad nueva colocada, es la continuidad de una que ya
      // administrábamos.
      prisma.rentalCommission.count({ where: { createdAt: { gte: startOfMonth }, origin: "ALQUILER" } }),
      prisma.contract.count({ where: { createdAt: { gte: startOfMonth }, isAdministered: true } }),
    ])
  );

  return { ventas, tasaciones, alquileresColocados, contratosAdministrados };
}

export type PendingItemType = "VENTA" | "ALQUILER" | "TASACION" | "ADMINISTRACION";

export interface PendingItem {
  type: PendingItemType;
  id: number;
  label: string;
  sublabel: string;
  amount: number;
  currency: string;
  dueDate: Date;
  // Calculado acá, no en el componente que renderiza la lista — leer el
  // reloj es un efecto secundario que no puede pasar durante el render
  // (regla react-hooks/purity), así que la comparación contra "ahora"
  // vive en esta capa de datos.
  isOverdue: boolean;
  href: string;
}

const typeLabels: Record<PendingItemType, string> = {
  VENTA: "Venta",
  ALQUILER: "Comisión alquiler",
  TASACION: "Tasación",
  ADMINISTRACION: "Liquidación",
};

export { typeLabels as pendingTypeLabels };

// Lista unificada de todo lo que falta cobrar, sin importar la unidad de
// negocio — ver conversación: ventas/alquileres/tasaciones no tienen
// noción de cartera (a diferencia de Administraciones, que sí), así que
// esas tres van sin scope; la parte de administración sí respeta el
// scope por grupo, igual que el resto del sistema desde la revisión de
// seguridad.
export async function getUnifiedPendingList(scope: ContractGroupScope, take = 40): Promise<PendingItem[]> {
  const groupWhere = contractGroupWhere(scope);

  const [ventaInstallments, alquilerInstallments, renovaciones, tasaciones, payments] = await withRetry(() =>
    Promise.all([
      prisma.commissionInstallment.findMany({
        where: { source: "VENTA", status: "PENDIENTE" },
        include: { sale: { include: { unit: true } } },
        orderBy: { dueDate: "asc" },
        take,
      }),
      prisma.commissionInstallment.findMany({
        where: { source: "ALQUILER", status: "PENDIENTE" },
        include: { rentalCommission: { include: { contract: { include: { unit: true } } } } },
        orderBy: { dueDate: "asc" },
        take,
      }),
      prisma.rentalCommission.findMany({
        where: { origin: "RENOVACION", cashMovement: null },
        include: { contract: { include: { unit: true } } },
        orderBy: { earnedAt: "asc" },
        take,
      }),
      prisma.appraisal.findMany({
        where: { cashMovement: null },
        include: { unit: true },
        orderBy: { completedAt: "asc" },
        take,
      }),
      prisma.payment.findMany({
        where: {
          status: { in: ["PENDIENTE", "ENVIADA", "PARCIAL"] },
          ...(groupWhere ? { contract: { OR: [{ isAdministered: false }, groupWhere] } } : {}),
        },
        include: { contract: { include: { unit: true } }, items: true },
        orderBy: { dueDate: "asc" },
        take,
      }),
    ])
  );

  // Calculado una sola vez acá (capa de datos), no en el componente que
  // renderiza — ver comentario en PendingItem.isOverdue.
  const now = Date.now();

  const items: PendingItem[] = [
    ...ventaInstallments
      .filter((i) => i.sale)
      .map((i): PendingItem => ({
        type: "VENTA",
        id: i.id,
        label: `${i.sale!.unit.propertyCode} — ${i.sale!.unit.address}`,
        sublabel: `Cuota ${i.numeroCuota}/${i.totalCuotas}`,
        amount: Number(i.amount),
        currency: i.currency,
        dueDate: i.dueDate,
        isOverdue: i.dueDate.getTime() < now,
        href: `/backoffice/caja/ventas/${i.sale!.id}`,
      })),
    ...alquilerInstallments
      .filter((i) => i.rentalCommission)
      .map((i): PendingItem => ({
        type: "ALQUILER",
        id: i.id,
        label: `${i.rentalCommission!.contract.unit.propertyCode} — ${i.rentalCommission!.contract.unit.address}`,
        sublabel: `Cuota ${i.numeroCuota}/${i.totalCuotas}`,
        amount: Number(i.amount),
        currency: i.currency,
        dueDate: i.dueDate,
        isOverdue: i.dueDate.getTime() < now,
        href: `/backoffice/caja/comisiones/${i.rentalCommission!.id}`,
      })),
    ...renovaciones.map((r): PendingItem => ({
      type: "ALQUILER",
      id: r.id,
      label: `${r.contract.unit.propertyCode} — ${r.contract.unit.address}`,
      sublabel: "Renovación",
      amount: Number(r.amount),
      currency: r.currency,
      dueDate: r.earnedAt,
      isOverdue: r.earnedAt.getTime() < now,
      href: `/backoffice/caja/comisiones/${r.id}`,
    })),
    ...tasaciones.map((t): PendingItem => ({
      type: "TASACION",
      id: t.id,
      label: `${t.unit.propertyCode} — ${t.unit.address}`,
      sublabel: "Sin cobrar",
      amount: Number(t.amount),
      currency: t.currency,
      dueDate: t.completedAt,
      isOverdue: t.completedAt.getTime() < now,
      href: `/backoffice/caja/tasaciones/${t.id}`,
    })),
    ...payments.map((p): PendingItem => ({
      type: "ADMINISTRACION",
      id: p.id,
      label: `${p.contract.unit.propertyCode} — ${p.contract.unit.address}`,
      sublabel: `${String(p.periodMonth).padStart(2, "0")}/${p.periodYear}`,
      amount: paymentTotal(p.items),
      currency: p.currency,
      isOverdue: p.dueDate.getTime() < now,
      dueDate: p.dueDate,
      href: `/backoffice/administraciones/${p.contractId}/liquidaciones/${p.id}`,
    })),
  ];

  items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return items.slice(0, take);
}

export interface AlertsSummary {
  // Contratos activos cuya próxima actualización (indexación) ya venció
  // y todavía no se cargó el nuevo valor — getContractsDueForIndexation
  // trae también las que vencen dentro de 30 días, acá nos quedamos solo
  // con las que YA pasaron la fecha.
  actualizaciones: { count: number };
  // Contratos activos que vencen dentro de los próximos 60 días —
  // reusa getContractsNearingEnd tal cual, sin filtro extra.
  vencimientos: { count: number };
  // TODO lo que falta cobrar y ya venció, en una sola bolsa: cuotas de
  // comisión de venta/alquiler, renovaciones, tasaciones Y liquidaciones
  // de administración (lo que antes era "Morosidad" acá). Antes esto
  // vivía separado ("morosidad" vs. "cobros atrasados" de caja) y
  // terminaba mostrando dos números distintos para superposición de la
  // misma plata — la vista detallada por bucket/interés sigue estando en
  // /administraciones/morosidad, esto es solo el llamado de atención.
  cobros: { count: number; amounts: CurrencyAmount[] };
}

function toAmounts(rows: { currency: string; _sum: { amount: unknown } }[]): CurrencyAmount[] {
  return rows.map((r) => ({ currency: r.currency, amount: Number(r._sum.amount ?? 0) }));
}

// Resumen para el panel de "Alertas" del dashboard y para el centro de
// notificaciones del header — reusa las mismas funciones/criterios que
// ya alimentan las páginas de Actualizaciones y Morosidad. `perms` decide
// qué partes correr: alguien sin administraciones.ver no necesita (ni
// puede ver) actualizaciones/vencimientos/liquidaciones, alguien sin
// caja.ver no necesita ventas/alquileres/tasaciones.
export async function getAlertsSummary(
  scope: ContractGroupScope,
  perms: { canAdmin: boolean; canCaja: boolean }
): Promise<AlertsSummary> {
  const now = new Date();

  const [
    dueIndexation,
    nearingEnd,
    overduePayments,
    ventasCount,
    ventasSum,
    alquilerCount,
    alquilerSum,
    renovacionesCount,
    renovacionesSum,
    tasacionesCount,
    tasacionesSum,
  ] = await withRetry(() =>
    Promise.all([
      perms.canAdmin ? getContractsDueForIndexation(scope, 30) : Promise.resolve([]),
      perms.canAdmin ? getContractsNearingEnd(scope, 60) : Promise.resolve([]),
      perms.canAdmin ? getOverduePayments(scope) : Promise.resolve([]),
      perms.canCaja
        ? prisma.commissionInstallment.count({ where: { source: "VENTA", status: "PENDIENTE", dueDate: { lt: now } } })
        : Promise.resolve(0),
      perms.canCaja
        ? prisma.commissionInstallment.groupBy({
            by: ["currency"],
            where: { source: "VENTA", status: "PENDIENTE", dueDate: { lt: now } },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
      perms.canCaja
        ? prisma.commissionInstallment.count({ where: { source: "ALQUILER", status: "PENDIENTE", dueDate: { lt: now } } })
        : Promise.resolve(0),
      perms.canCaja
        ? prisma.commissionInstallment.groupBy({
            by: ["currency"],
            where: { source: "ALQUILER", status: "PENDIENTE", dueDate: { lt: now } },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
      perms.canCaja
        ? prisma.rentalCommission.count({ where: { origin: "RENOVACION", cashMovement: null, earnedAt: { lt: now } } })
        : Promise.resolve(0),
      perms.canCaja
        ? prisma.rentalCommission.groupBy({
            by: ["currency"],
            where: { origin: "RENOVACION", cashMovement: null, earnedAt: { lt: now } },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
      perms.canCaja
        ? prisma.appraisal.count({ where: { cashMovement: null, completedAt: { lt: now } } })
        : Promise.resolve(0),
      perms.canCaja
        ? prisma.appraisal.groupBy({
            by: ["currency"],
            where: { cashMovement: null, completedAt: { lt: now } },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
    ])
  );

  const nowMs = now.getTime();
  const actualizacionesAtrasadas = dueIndexation.filter(
    (c) => c.nextIndexationDueAt !== null && c.nextIndexationDueAt.getTime() < nowMs
  ).length;

  const cobrosAmounts = mergeAmounts(
    toAmounts(ventasSum),
    toAmounts(alquilerSum),
    toAmounts(renovacionesSum),
    toAmounts(tasacionesSum)
  );
  for (const p of overduePayments) {
    const existing = cobrosAmounts.find((a) => a.currency === p.currency);
    if (existing) existing.amount += p.saldo;
    else cobrosAmounts.push({ currency: p.currency, amount: p.saldo });
  }

  return {
    actualizaciones: { count: actualizacionesAtrasadas },
    vencimientos: { count: nearingEnd.length },
    cobros: {
      count: ventasCount + alquilerCount + renovacionesCount + tasacionesCount + overduePayments.length,
      amounts: cobrosAmounts,
    },
  };
}
