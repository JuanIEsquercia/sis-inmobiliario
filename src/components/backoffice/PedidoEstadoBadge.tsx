import type { PedidoEstado } from "@/generated/prisma/client";

const labels: Record<PedidoEstado, string> = {
  ABIERTO: "Abierto",
  EN_BUSQUEDA: "En búsqueda",
  CONSEGUIDO: "Conseguido",
  DESCARTADO: "Descartado",
};

const styles: Record<PedidoEstado, string> = {
  ABIERTO: "bg-surface text-foreground",
  EN_BUSQUEDA: "bg-accent/10 text-accent",
  CONSEGUIDO: "bg-emerald-500/10 text-emerald-600",
  DESCARTADO: "bg-border text-muted",
};

export function PedidoEstadoBadge({ estado }: { estado: PedidoEstado }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[estado]}`}>
      {labels[estado]}
    </span>
  );
}
