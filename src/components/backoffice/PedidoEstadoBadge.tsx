import type { PedidoEstado } from "@/generated/prisma/client";

const labels: Record<PedidoEstado, string> = {
  ABIERTO: "Abierto",
  EN_BUSQUEDA: "En búsqueda",
  CONSEGUIDO: "Conseguido",
  DESCARTADO: "Descartado",
};

const styles: Record<PedidoEstado, string> = {
  ABIERTO: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/10",
  EN_BUSQUEDA: "bg-accent-soft text-accent border border-accent/10",
  CONSEGUIDO: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10",
  DESCARTADO: "bg-muted/10 text-muted border border-muted/10",
};

export function PedidoEstadoBadge({ estado }: { estado: PedidoEstado }) {
  return (
    <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${styles[estado]}`}>
      {labels[estado]}
    </span>
  );
}

