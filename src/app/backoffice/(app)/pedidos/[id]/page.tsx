import { notFound } from "next/navigation";
import { getPedidoById, tomadoLabel, creadoPorLabel } from "@/lib/pedidos";
import { PedidoEstadoBadge } from "@/components/backoffice/PedidoEstadoBadge";
import { requirePermission } from "@/lib/auth";
import { updatePedidoEstado, tomarPedido, soltarPedido } from "../actions";
import type { PedidoEstado } from "@/generated/prisma/client";

const estadosDisponibles: { value: PedidoEstado; label: string }[] = [
  { value: "ABIERTO", label: "Abierto" },
  { value: "EN_BUSQUEDA", label: "En búsqueda" },
  { value: "CONSEGUIDO", label: "Conseguido" },
  { value: "DESCARTADO", label: "Descartado" },
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PedidoDetailPage({ params }: PageProps) {
  const profile = await requirePermission("pedidos.ver");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const pedido = await getPedidoById(numericId);
  if (!pedido) notFound();

  return (
    <div className="max-w-5xl w-full mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{pedido.clienteNombre}</h1>
          <p className="text-sm text-muted">Cargado por {creadoPorLabel(pedido.creadoPor)}</p>
        </div>
        <PedidoEstadoBadge estado={pedido.estado} />
      </div>

      {/* Tomar/soltar — exclusivo: si ya lo tomó otro agente, acá se ve
          quién fue en vez de dejar que otro lo tome sin saberlo. */}
      {profile.permissions.includes("pedidos.estado") && (
        <div className="mb-6 rounded-xl border border-border p-4 flex items-center justify-between gap-3 text-sm">
          {pedido.tomadoPorId ? (
            <>
              <span className="text-foreground">
                Tomado por <strong>{tomadoLabel(pedido.tomadoPor)}</strong>
                {pedido.tomadoAt && (
                  <span className="text-muted"> · {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(pedido.tomadoAt)}</span>
                )}
              </span>
              {pedido.tomadoPorId === profile.id && (
                <form action={soltarPedido.bind(null, pedido.id)}>
                  <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface">
                    Soltar
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <span className="text-muted italic">Nadie lo tomó todavía</span>
              <form action={tomarPedido.bind(null, pedido.id)}>
                <button type="submit" className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground hover:bg-accent-strong">
                  Tomar pedido
                </button>
              </form>
            </>
          )}
        </div>
      )}

      <dl className="mb-6 grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl border border-border p-5 text-sm">
        <div>
          <dt className="text-muted">Contacto</dt>
          <dd className="text-foreground">
            {[pedido.clienteTelefono, pedido.clienteEmail].filter(Boolean).join(" · ") || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Busca</dt>
          <dd className="text-foreground">
            {pedido.operationType}
            {pedido.propertyType ? ` · ${pedido.propertyType}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Zona</dt>
          <dd className="text-foreground">{pedido.zona ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Presupuesto</dt>
          <dd className="text-foreground">
            {pedido.precioMin || pedido.precioMax
              ? `${pedido.moneda ?? ""} ${pedido.precioMin ?? "?"} - ${pedido.precioMax ?? "?"}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Ambientes mín.</dt>
          <dd className="text-foreground">{pedido.ambientesMin ?? "—"}</dd>
        </div>
        {pedido.matchedListing && (
          <div>
            <dt className="text-muted">Resuelto con</dt>
            <dd className="text-foreground">{pedido.matchedListing.title}</dd>
          </div>
        )}
        {pedido.notas && (
          <div className="col-span-2">
            <dt className="text-muted">Notas</dt>
            <dd className="whitespace-pre-line text-foreground">{pedido.notas}</dd>
          </div>
        )}
      </dl>

      {profile.permissions.includes("pedidos.estado") && (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Cambiar estado</p>
          <div className="flex flex-wrap gap-2">
            {estadosDisponibles
              .filter((e) => e.value !== pedido.estado)
              .map((e) => (
                <form key={e.value} action={updatePedidoEstado.bind(null, pedido.id, e.value)}>
                  <button
                    type="submit"
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground hover:bg-surface"
                  >
                    {e.label}
                  </button>
                </form>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
