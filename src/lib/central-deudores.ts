import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import type { DeudaPeriodo, DeudaResult, ChequesResult } from "@/lib/bcra";

export function getCreditCheckByCuit(cuit: string) {
  return withRetry(() =>
    prisma.creditCheck.findUnique({
      where: { cuit },
      include: { consultedBy: { select: { firstName: true, lastName: true, username: true } } },
    })
  );
}

export function getRecentCreditChecks(take = 30) {
  return withRetry(() =>
    prisma.creditCheck.findMany({
      orderBy: { consultedAt: "desc" },
      take,
      include: { consultedBy: { select: { firstName: true, lastName: true, username: true } } },
    })
  );
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

export function totalChequesRechazados(cheques: ChequesResult | null): number {
  if (!cheques) return 0;
  return cheques.causales.reduce(
    (acc, c) => acc + c.entidades.reduce((accE, e) => accE + e.detalle.length, 0),
    0
  );
}

export function consultantLabel(p: { firstName: string | null; lastName: string | null; username: string } | null): string {
  if (!p) return "—";
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
  return name || `@${p.username}`;
}
