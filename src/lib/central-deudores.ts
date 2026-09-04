import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import type { DeudaPeriodo, DeudaResult, ChequesResult } from "@/lib/bcra";

const consultedByLabelSelect = { select: { firstName: true, lastName: true, username: true } } as const;

// Una consulta puntual por id — ya no hay "la" consulta de un CUIT, hay
// varias en el tiempo; esta trae una en particular.
export function getCreditCheckById(id: number) {
  return withRetry(() =>
    prisma.creditCheck.findUnique({
      where: { id },
      include: { consultedBy: consultedByLabelSelect },
    })
  );
}

// Todo el historial de consultas de un mismo CUIT, de más reciente a
// más vieja — la pantalla "historial de este CUIT".
export function getCreditChecksByCuit(cuit: string) {
  return withRetry(() =>
    prisma.creditCheck.findMany({
      where: { cuit },
      orderBy: { consultedAt: "desc" },
      include: { consultedBy: consultedByLabelSelect },
    })
  );
}

export interface CreditCheckGrouped {
  id: number;
  cuit: string;
  denominacion: string | null;
  found: boolean;
  situacionActual: number | null;
  consultedAt: Date;
  consultedBy: { firstName: string | null; lastName: string | null; username: string } | null;
  totalConsultas: number;
}

// Listado principal: una fila por CUIT (la consulta más reciente),
// con la cantidad total de consultas guardadas para esa persona — el
// historial completo se ve entrando a esa fila. `distinct` + `orderBy`
// en Postgres devuelve, por cada valor de `cuit`, el primer registro
// según ese orden — es la forma estándar de Prisma para "el último de
// cada grupo" sin escribir SQL a mano.
export async function getLatestCreditChecksGrouped(take = 30): Promise<CreditCheckGrouped[]> {
  const [latest, counts] = await Promise.all([
    withRetry(() =>
      prisma.creditCheck.findMany({
        distinct: ["cuit"],
        orderBy: { consultedAt: "desc" },
        take,
        include: { consultedBy: consultedByLabelSelect },
      })
    ),
    withRetry(() => prisma.creditCheck.groupBy({ by: ["cuit"], _count: { _all: true } })),
  ]);

  const countByCuit = new Map(counts.map((c) => [c.cuit, c._count._all]));
  return latest.map((c) => ({ ...c, totalConsultas: countByCuit.get(c.cuit) ?? 1 }));
}

// El período más reciente del array `periodos` — la API no garantiza
// el orden, así que se ordena por el string AAAAMM (compara bien como
// texto porque tiene ancho fijo) en vez de asumir que ya viene
// ordenado.
export function ultimoPeriodo(deuda: DeudaResult | null): DeudaPeriodo | null {
  if (!deuda || deuda.periodos.length === 0) return null;
  return [...deuda.periodos].sort((a, b) => b.periodo.localeCompare(a.periodo))[0];
}

// Peor situación informada entre todas las entidades del último
// período — es lo que se muestra como badge resumen: a un postulante
// no le alcanza con estar en situación 1 en un banco si en otro figura
// en situación 4.
export function peorSituacion(deuda: DeudaResult | null): number | null {
  const periodo = ultimoPeriodo(deuda);
  if (!periodo || periodo.entidades.length === 0) return null;
  return Math.max(...periodo.entidades.map((e) => e.situacion));
}

export interface HistoricoBancoGroup {
  entidad: string;
  peorSituacion: number;
  periodos: { periodo: string; situacion: number; monto: number; enRevision: boolean; procesoJud: boolean }[];
}

// Agrupa el histórico de 24 meses por banco (en vez de la lista plana
// período-por-período que devuelve la API) — así se puede seguir la
// evolución de un mismo banco en el tiempo de un vistazo, en lugar de
// tener que buscarlo fila por fila entre los demás. Los bancos con peor
// situación en algún momento de la ventana quedan arriba, y dentro de
// cada banco los períodos van del más reciente al más viejo.
export function groupHistoricoByEntidad(historico: DeudaResult | null): HistoricoBancoGroup[] {
  if (!historico) return [];

  const map = new Map<string, HistoricoBancoGroup["periodos"]>();
  for (const periodo of historico.periodos) {
    for (const e of periodo.entidades) {
      const list = map.get(e.entidad) ?? [];
      list.push({ periodo: periodo.periodo, situacion: e.situacion, monto: e.monto, enRevision: e.enRevision, procesoJud: e.procesoJud });
      map.set(e.entidad, list);
    }
  }

  const groups: HistoricoBancoGroup[] = [...map.entries()].map(([entidad, periodos]) => ({
    entidad,
    peorSituacion: Math.max(...periodos.map((p) => p.situacion)),
    periodos: [...periodos].sort((a, b) => b.periodo.localeCompare(a.periodo)),
  }));

  return groups.sort((a, b) => b.peorSituacion - a.peorSituacion || a.entidad.localeCompare(b.entidad));
}

export function totalChequesRechazados(cheques: ChequesResult | null): number {
  if (!cheques) return 0;
  return cheques.causales.reduce(
    (acc, c) => acc + c.entidades.reduce((accE, e) => accE + e.detalle.length, 0),
    0
  );
}

export interface ResumenCheques {
  totalCantidad: number;
  totalMonto: number;
  abonadosCantidad: number;
  abonadosMonto: number;
}

// El endpoint ChequesRechazados del BCRA no trae este resumen agregado
// (solo la lista de cheques uno por uno) — a diferencia del reporte que
// publica la propia web del BCRA, que sí lo muestra. Se calcula acá con
// los mismos cheques que ya trae la consulta: "abonado" = tiene
// `fechaPago` cargada (el manual la define como "fecha que se realizó
// el levantamiento del cheque"), no confundir con `fechaPagoMulta`
// (que es la multa por el rechazo, un concepto aparte).
export function resumenChequesRechazados(cheques: ChequesResult | null): ResumenCheques {
  const detalles = cheques ? cheques.causales.flatMap((c) => c.entidades.flatMap((e) => e.detalle)) : [];
  const abonados = detalles.filter((d) => d.fechaPago !== null);
  return {
    totalCantidad: detalles.length,
    totalMonto: detalles.reduce((acc, d) => acc + d.monto, 0),
    abonadosCantidad: abonados.length,
    abonadosMonto: abonados.reduce((acc, d) => acc + d.monto, 0),
  };
}

export function consultantLabel(p: { firstName: string | null; lastName: string | null; username: string } | null): string {
  if (!p) return "—";
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
  return name || `@${p.username}`;
}
