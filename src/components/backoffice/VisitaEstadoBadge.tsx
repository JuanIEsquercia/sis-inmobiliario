import { ESTADO_VISITA_LABEL, llaveAfuera, type EstadoVisita } from "@/lib/visit-rules";
import type { KeyLocation } from "@/generated/prisma/client";

const ESTILO: Record<EstadoVisita, string> = {
  PEDIDA: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  RETIRADA: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  COORDINADA: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  REALIZADA: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  DEVUELTA: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  CANCELADA: "border-border bg-surface text-muted",
};

// Estado de la visita, más un aviso si la llave de la inmobiliaria sigue
// afuera o falta confirmar que volvió.
export function VisitaEstadoBadge({
  v,
}: {
  v: { status: EstadoVisita; keyLocation: KeyLocation; retiradaAt: Date | null; devueltaAt: Date | null; returnConfirmedAt: Date | null };
}) {
  const afuera = llaveAfuera(v) && v.status !== "RETIRADA";
  const porConfirmar = v.keyLocation === "INMOBILIARIA" && v.devueltaAt && !v.returnConfirmedAt;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ESTILO[v.status]}`}>
        {ESTADO_VISITA_LABEL[v.status]}
      </span>
      {afuera && (
        <span className="inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          Llave sin devolver
        </span>
      )}
      {porConfirmar && (
        <span className="inline-block rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">Devolución sin confirmar</span>
      )}
    </span>
  );
}
