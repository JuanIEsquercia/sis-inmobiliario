import { ESTADO_LABEL } from "@/lib/propiedades";
import type { ListingStatus } from "@/generated/prisma/client";

const ESTILO: Record<ListingStatus, string> = {
  DISPONIBLE: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  RESERVADA: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  VENDIDA: "border-border bg-surface text-muted",
  ALQUILADA: "border-border bg-surface text-muted",
  SUSPENDIDA: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function EstadoPropiedadBadge({ estado }: { estado: ListingStatus }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ESTILO[estado]}`}>
      {ESTADO_LABEL[estado]}
    </span>
  );
}
