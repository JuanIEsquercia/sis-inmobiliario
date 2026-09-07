import Link from "next/link";
import { getPedidos, tomadoLabel, creadoPorLabel } from "@/lib/pedidos";
import { PedidoEstadoBadge } from "@/components/backoffice/PedidoEstadoBadge";
import { requirePermission } from "@/lib/auth";
import { tomarPedido, soltarPedido } from "./actions";
import { KpiStatCard } from "@/components/backoffice/KpiStatCard";
import { ResponsiveDataGrid } from "@/components/backoffice/ResponsiveDataGrid";
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

  // Métricas
  const totalAbiertos = pedidos.filter((p) => p.estado === "ABIERTO" || p.estado === "EN_BUSQUEDA").length;
  const libresParaTomar = pedidos.filter((p) => !p.tomadoPorId).length;

  return (
    <div className="space-y-6">
      {/* Header y Acción Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">Pedidos de Clientes</h1>
          <p className="text-xs text-muted mt-1">Gestión de búsquedas activas de inmuebles y asignación de agentes</p>
        </div>
        {profile.permissions.includes("pedidos.crear") && (
          <Link
            href="/backoffice/pedidos/nuevo"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-xs font-bold uppercase tracking-wider text-accent-foreground transition-all hover:bg-accent-strong hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm shadow-accent/10 shrink-0"
          >
            Nuevo pedido
          </Link>
        )}
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiStatCard
          title="Total Pedidos"
          value={pedidos.length}
          subtitle={estadoFiltro ? `Filtro: ${estadoFiltro}` : "Registrados en el sistema"}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <KpiStatCard
          title="Abiertos / En Búsqueda"
          value={totalAbiertos}
          subtitle="Búsquedas activas hoy"
          badge={{ label: "Activos", variant: "accent" }}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
        <KpiStatCard
          title="Pedidos Libres"
          value={libresParaTomar}
          subtitle="Sin agente asignado"
          badge={{ label: libresParaTomar > 0 ? "Disponibles" : "Al día", variant: libresParaTomar > 0 ? "warning" : "success" }}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          }
        />
      </div>

      {/* Filtros por Estado */}
      <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wider overflow-x-auto pb-1 no-scrollbar">
        {estados.map((e) => (
          <Link
            key={e.label}
            href={e.value ? `/backoffice/pedidos?estado=${e.value}` : "/backoffice/pedidos"}
            className={`shrink-0 rounded-xl px-4 py-2.5 border transition-all duration-200 cursor-pointer ${
              estadoFiltro === e.value
                ? "bg-accent border-accent text-accent-foreground shadow-md shadow-accent/10"
                : "border-border/60 bg-surface text-muted hover:text-foreground hover:border-accent/40"
            }`}
          >
            {e.label}
          </Link>
        ))}
      </div>

      {/* Grid Adaptativo (Tarjetas Móviles + Tabla Desktop) */}
      <ResponsiveDataGrid
        isEmpty={pedidos.length === 0}
        emptyMessage="No hay pedidos registrados para esta categoría."
        mobileCards={
          <>
            {pedidos.map((p) => {
              const isMine = p.tomadoPorId === profile.id;
              const isTaken = Boolean(p.tomadoPorId);
              const agenteTomador = tomadoLabel(p.tomadoPor);

              return (
                <div key={p.id} className="rounded-2xl border border-border/60 bg-surface p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
                    <div>
                      <Link
                        href={`/backoffice/pedidos/${p.id}`}
                        className="font-bold text-foreground hover:text-accent transition-colors text-base"
                      >
                        {p.clienteNombre}
                      </Link>
                      <p className="text-xs font-semibold text-accent mt-0.5">
                        {p.operationType} {p.propertyType ? `· ${p.propertyType}` : ""}
                      </p>
                    </div>
                    <PedidoEstadoBadge estado={p.estado} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Zona</span>
                      <span className="font-semibold text-foreground">{p.zona ?? "—"}</span>
                    </div>
                    <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Cargado Por</span>
                      <span className="font-semibold text-foreground">{creadoPorLabel(p.creadoPor)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-background/50 p-3 rounded-xl border border-border/40 text-xs">
                    <div>
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Tomado Por</span>
                      <span className={`font-semibold ${agenteTomador ? "text-foreground" : "text-muted/60 italic"}`}>
                        {agenteTomador ?? "Libre (Sin asignar)"}
                      </span>
                    </div>
                    {canTomar && (
                      <div>
                        {isMine ? (
                          <form action={soltarPedido.bind(null, p.id)}>
                            <button
                              type="submit"
                              className="h-9 px-4 rounded-xl border border-border bg-surface text-xs font-bold text-foreground hover:bg-background cursor-pointer shadow-xs"
                            >
                              Soltar
                            </button>
                          </form>
                        ) : !isTaken ? (
                          <form action={tomarPedido.bind(null, p.id)}>
                            <button
                              type="submit"
                              className="h-9 px-4 rounded-xl bg-accent text-xs font-bold text-accent-foreground hover:bg-accent-strong cursor-pointer shadow-xs"
                            >
                              Tomar Pedido
                            </button>
                          </form>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="pt-1">
                    <Link
                      href={`/backoffice/pedidos/${p.id}`}
                      className="flex h-10 w-full items-center justify-center rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-background transition-colors"
                    >
                      Ver Detalle Completo
                    </Link>
                  </div>
                </div>
              );
            })}
          </>
        }
        table={
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
                            <button
                              type="submit"
                              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold hover:bg-surface cursor-pointer"
                            >
                              Soltar
                            </button>
                          </form>
                        ) : !p.tomadoPorId ? (
                          <form action={tomarPedido.bind(null, p.id)}>
                            <button
                              type="submit"
                              className="rounded-lg bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground hover:bg-accent-strong cursor-pointer"
                            >
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
        }
      />
    </div>
  );
}
