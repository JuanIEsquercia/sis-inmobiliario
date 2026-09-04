import Link from "next/link";
import { getPedidos, tomadoLabel, creadoPorLabel } from "@/lib/pedidos";
import { PedidoEstadoBadge } from "@/components/backoffice/PedidoEstadoBadge";
import { requirePermission } from "@/lib/auth";
import { tomarPedido, soltarPedido } from "./actions";
import type { PedidoEstado } from "@/generated/prisma/client";

const estados: { value: PedidoEstado | undefined; label: string }[] = [
  { value: undefined, label: "Todos" },
  { value: "ABIERTO", label: "Abiertos" },
  { value: "EN_BUSQUEDA", label: "En búsqueda" },
  { value: "CONSEGUIDO", label: "Conseguidos" },
  { value: "DESCARTADO", label: "Descartados" },
];

interface PageProps {
  searchParams: Promise<{ estado?: string }>;
}

export default async function PedidosPage({ searchParams }: PageProps) {
  const profile = await requirePermission("pedidos.ver");
  const sp = await searchParams;
  const estadoFiltro = sp.estado as PedidoEstado | undefined;
  const pedidos = await getPedidos(estadoFiltro);
  const canTomar = profile.permissions.includes("pedidos.estado");

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">Pedidos</h1>
        {profile.permissions.includes("pedidos.crear") && (
          <Link
            href="/backoffice/pedidos/nuevo"
            className="rounded-xl bg-accent px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-accent-foreground transition-all hover:bg-accent-strong hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm shadow-accent/10"
          >
            Nuevo pedido
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
        {estados.map((e) => (
          <Link
            key={e.label}
            href={e.value ? `/backoffice/pedidos?estado=${e.value}` : "/backoffice/pedidos"}
            className={`rounded-xl px-4 py-2 border transition-all duration-200 cursor-pointer ${
              estadoFiltro === e.value
                ? "bg-accent border-accent text-accent-foreground shadow-md shadow-accent/10"
                : "border-border/60 bg-surface text-muted hover:text-foreground hover:border-accent/40"
            }`}
          >
            {e.label}
          </Link>
        ))}
      </div>

      {pedidos.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-surface p-12 text-center">
          <p className="text-sm text-muted">No hay pedidos registrados para esta categoría.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/50 bg-surface shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-background/30 text-[10px] font-bold uppercase tracking-widest text-muted/80">
                <th className="px-5 py-4">Cliente</th>
                <th className="px-5 py-4">Busca</th>
                <th className="px-5 py-4">Zona</th>
                <th className="px-5 py-4">Cargado por</th>
                <th className="px-5 py-4">Tomado por</th>
                <th className="px-5 py-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr 
                  key={p.id} 
                  className="border-b border-border/30 last:border-0 hover:bg-background/40 transition-colors duration-150"
                >
                  <td className="px-5 py-4">
                    <Link 
                      href={`/backoffice/pedidos/${p.id}`} 
                      className="font-semibold text-foreground hover:text-accent transition-colors"
                    >
                      {p.clienteNombre}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-muted">
                    <span className="font-medium text-foreground">{p.operationType}</span>
                    {p.propertyType ? ` · ${p.propertyType}` : ""}
                  </td>
                  <td className="px-5 py-4 text-muted font-medium">{p.zona ?? "—"}</td>
                  <td className="px-5 py-4 text-muted/80 font-medium">{creadoPorLabel(p.creadoPor)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {tomadoLabel(p.tomadoPor) ? (
                        <span className="font-semibold text-foreground">{tomadoLabel(p.tomadoPor)}</span>
                      ) : (
                        <span className="text-muted/60 italic">Libre</span>
                      )}
                      {canTomar &&
                        (p.tomadoPorId === profile.id ? (
                          <form action={soltarPedido.bind(null, p.id)}>
                            <button type="submit" className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold hover:bg-surface cursor-pointer">
                              Soltar
                            </button>
                          </form>
                        ) : !p.tomadoPorId ? (
                          <form action={tomarPedido.bind(null, p.id)}>
                            <button type="submit" className="rounded-lg bg-accent px-2 py-1 text-[11px] font-bold text-accent-foreground hover:bg-accent-strong cursor-pointer">
                              Tomar
                            </button>
                          </form>
                        ) : null)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <PedidoEstadoBadge estado={p.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

