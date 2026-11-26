import { notFound } from "next/navigation";
import { ActionForm } from "@/components/backoffice/ActionForm";
import { getPedidoById, tomadoLabel, creadoPorLabel } from "@/lib/pedidos";
import { PedidoEstadoBadge } from "@/components/backoffice/PedidoEstadoBadge";
import { requirePermission } from "@/lib/auth";
import { updatePedidoEstado, tomarPedido, soltarPedido, eliminarPedido } from "../actions";
import { ConfirmDeleteButton } from "@/components/backoffice/ConfirmDeleteButton";
import type { PedidoEstado } from "@/generated/prisma/client";
import { VisitasTabla } from "@/components/backoffice/VisitasTabla";
import { alcanceVisitas, getVisitasDe } from "@/lib/visitas";

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
  const visitas = profile.permissions.includes("visitas.pedir")
    ? await getVisitasDe({ pedidoId: pedido.id }, alcanceVisitas(profile))
    : null;

  return (
    <div className="max-w-5xl w-full mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{pedido.clienteNombre}</h1>
          <p className="text-sm text-muted">Cargado por {creadoPorLabel(pedido.creadoPor)}</p>
        </div>
        <div className="flex items-center gap-3">
          <PedidoEstadoBadge estado={pedido.estado} />
          {profile.permissions.includes("pedidos.eliminar") && (
            <ConfirmDeleteButton
              mensajeExito="Pedido eliminado"
              action={eliminarPedido.bind(null, pedido.id)}
              title="¿Eliminar este pedido?"
              description={`Se borra definitivamente el pedido de ${pedido.clienteNombre}. Usalo para pruebas o cargas repetidas; si el pedido fue real y se cerró, mejor marcarlo Conseguido o Descartado.`}
            />
          )}
        </div>
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
                <ActionForm mensajeExito="Pedido liberado" action={soltarPedido.bind(null, pedido.id)}>
                  <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface">
                    Soltar
                  </button>
                </ActionForm>
              )}
            </>
          ) : (
            <>
              <span className="text-muted italic">Nadie lo tomó todavía</span>
              <ActionForm mensajeExito="Pedido tomado" action={tomarPedido.bind(null, pedido.id)}>
                <button type="submit" className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground hover:bg-accent-strong">
                  Tomar pedido
                </button>
              </ActionForm>
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
                <ActionForm key={e.value} mensajeExito="Estado actualizado" action={updatePedidoEstado.bind(null, pedido.id, e.value)}>
                  <button
                    type="submit"
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground hover:bg-surface"
                  >
                    {e.label}
                  </button>
                </ActionForm>
              ))}
          </div>
        </div>
      )}

      {visitas && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Visitas de este pedido</h2>
          <VisitasTabla visitas={visitas} sin={["interesado"]} vacio="Todavía no visitó ninguna propiedad." />
        </section>
      )}
    </div>
  );
}
