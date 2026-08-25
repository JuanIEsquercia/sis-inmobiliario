import Link from "next/link";
import { getPedidos } from "@/lib/pedidos";
import { PedidoEstadoBadge } from "@/components/backoffice/PedidoEstadoBadge";
import { requirePermission } from "@/lib/auth";
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Pedidos</h1>
        {profile.permissions.includes("pedidos.crear") && (
          <Link
            href="/backoffice/pedidos/nuevo"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
          >
            Nuevo pedido
          </Link>
        )}
      </div>

      <div className="mb-5 flex gap-2 text-sm">
        {estados.map((e) => (
          <Link
            key={e.label}
            href={e.value ? `/backoffice/pedidos?estado=${e.value}` : "/backoffice/pedidos"}
            className={`rounded-full px-3 py-1.5 ${
              estadoFiltro === e.value
                ? "bg-accent text-accent-foreground"
                : "border border-border text-muted hover:text-foreground"
            }`}
          >
            {e.label}
          </Link>
        ))}
      </div>

      {pedidos.length === 0 ? (
        <p className="text-sm text-muted">No hay pedidos para este filtro.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Busca</th>
                <th className="px-4 py-3">Zona</th>
                <th className="px-4 py-3">Cargado por</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link href={`/backoffice/pedidos/${p.id}`} className="font-medium text-foreground hover:underline">
                      {p.clienteNombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {p.operationType}
                    {p.propertyType ? ` · ${p.propertyType}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted">{p.zona ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">@{p.creadoPor.username}</td>
                  <td className="px-4 py-3">
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
