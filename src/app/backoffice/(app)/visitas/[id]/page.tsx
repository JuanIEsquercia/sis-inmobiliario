import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getCategoriasResultado, getVisitaById, interesadoLabel, puedeGestionarLlaves } from "@/lib/visitas";
import {
  ACCION_LABEL,
  EVENTO_LABEL,
  QUIEN,
  accionesPosibles,
  finDeTurno,
  mensajeContactoLlave,
  type AccionVisita,
} from "@/lib/visit-rules";
import { toWhatsAppLink } from "@/lib/whatsapp";
import { formatDateTime } from "@/lib/format";
import { ActionForm } from "@/components/backoffice/ActionForm";
import { SubmitButton } from "@/components/backoffice/SubmitButton";
import { LlaveResumen } from "@/components/backoffice/LlaveResumen";
import { VisitaEstadoBadge } from "@/components/backoffice/VisitaEstadoBadge";
import { avanzarVisita } from "../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

const boton = "rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:bg-accent-strong cursor-pointer";
const botonSecundario = "rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:bg-surface cursor-pointer";

function FormAccion({
  visitId,
  accion,
  children,
  principal = false,
}: {
  visitId: number;
  accion: AccionVisita;
  children?: React.ReactNode;
  principal?: boolean;
}) {
  return (
    <ActionForm action={avanzarVisita.bind(null, visitId, accion)} mensajeExito={ACCION_LABEL[accion]} className="flex flex-wrap items-end gap-2">
      {children}
      <SubmitButton className={principal ? boton : botonSecundario}>{ACCION_LABEL[accion]}</SubmitButton>
    </ActionForm>
  );
}

export default async function VisitaPage({ params }: PageProps) {
  const profile = await requirePermission("visitas.pedir");
  const { id } = await params;
  const visitId = Number(id);
  if (!Number.isInteger(visitId)) notFound();

  const v = await getVisitaById(visitId);
  const gestor = puedeGestionarLlaves(profile);
  const esSuya = v?.vendedorId === profile.id;
  // Cada vendedor ve sus tarjetas; quien gestiona llaves, todas.
  if (!v || !(esSuya || gestor)) notFound();

  const acciones = accionesPosibles(v).filter((a) => (QUIEN[a] === "gestor" ? gestor : esSuya || gestor));
  const categorias = acciones.includes("realizar") ? await getCategoriasResultado() : [];
  const dia = v.date.toISOString().slice(0, 10);
  const diaTexto = dia.split("-").reverse().join("/");
  const propiedad = v.listing.address ?? v.listing.contentTitle ?? v.listing.title;
  const contacto = v.listing.keyContact;
  const abierta = ["PEDIDA", "COORDINADA"].includes(v.status);

  const whatsapp =
    v.keyLocation === "CONTACTO" && contacto?.phone && abierta
      ? toWhatsAppLink(
          contacto.phone,
          mensajeContactoLlave({
            contacto: contacto.firstName,
            propiedad,
            codigo: v.listing.code,
            dia,
            slot: v.slot,
            vendedor: v.vendedor.firstName ?? `@${v.vendedor.username}`,
          })
        )
      : null;

  const puedeVerCliente = profile.permissions.includes("clientes.ver");
  const puedeVerPedido = profile.permissions.includes("pedidos.ver");

  return (
    <div className="max-w-4xl w-full mx-auto">
      <Link href="/backoffice/visitas" className="mb-2 inline-block text-xs text-accent hover:underline">
        ← Tarjetas de visita
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Visita #{v.id} · {diaTexto} {v.slot}–{finDeTurno(v.slot)}
          </h1>
          <p className="mt-1 text-sm text-muted">
            <Link href={`/backoffice/propiedades/${v.listing.id}`} className="font-medium text-foreground hover:underline">
              Código {v.listing.code ?? "—"} · {propiedad}
            </Link>
          </p>
        </div>
        <VisitaEstadoBadge v={v} />
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-border p-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted">Vendedor</dt>
          <dd className="text-sm text-foreground">@{v.vendedor.username}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Interesado</dt>
          <dd className="text-sm text-foreground">
            {v.client && puedeVerCliente ? (
              <Link href={`/backoffice/clientes/${v.client.id}`} className="hover:underline">{interesadoLabel(v)}</Link>
            ) : v.pedido && puedeVerPedido ? (
              <Link href={`/backoffice/pedidos/${v.pedido.id}`} className="hover:underline">{interesadoLabel(v)}</Link>
            ) : (
              interesadoLabel(v)
            )}
            {(v.client?.phone || v.pedido?.clienteTelefono) && (
              <span className="block text-xs text-muted">{v.client?.phone ?? v.pedido?.clienteTelefono}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Resultado</dt>
          <dd className="text-sm text-foreground">{v.outcome?.name ?? "—"}</dd>
        </div>
      </dl>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Llave</h2>
        <LlaveResumen l={v.listing} />
        {v.keyLocation !== v.listing.keyLocation && (
          <p className="mt-1 text-xs text-muted">Al pedirla estaba {v.keyLocation === "INMOBILIARIA" ? "en la inmobiliaria" : "con un contacto"}.</p>
        )}
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">
            Escribir por WhatsApp a {contacto!.firstName}
          </a>
        )}
        {v.keyLocation === "CONTACTO" && abierta && !contacto?.phone && (
          <p className="mt-2 text-xs text-muted">El contacto no tiene teléfono cargado: hay que coordinar por otro medio.</p>
        )}
      </section>

      {acciones.length > 0 && (
        <section className="mt-6 flex flex-col gap-3 rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Próximo paso</h2>
          {acciones.includes("retirar") && <FormAccion visitId={visitId} accion="retirar" principal />}
          {acciones.includes("coordinar") && <FormAccion visitId={visitId} accion="coordinar" principal />}
          {acciones.includes("realizar") && (
            <FormAccion visitId={visitId} accion="realizar" principal>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Resultado de la visita*</span>
                <select name="outcomeId" required defaultValue="" className="field min-w-64">
                  <option value="" disabled>Elegir...</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </FormAccion>
          )}
          {acciones.includes("devolver") && <FormAccion visitId={visitId} accion="devolver" principal />}
          {acciones.includes("confirmarDevolucion") && <FormAccion visitId={visitId} accion="confirmarDevolucion" principal />}
          {acciones.includes("cancelar") && (
            <details className="text-sm">
              <summary className="cursor-pointer text-xs text-muted hover:text-foreground">Cancelar la visita</summary>
              <div className="mt-2">
                <FormAccion visitId={visitId} accion="cancelar">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted">Motivo (opcional)</span>
                    <input name="cancelReason" className="field min-w-64" />
                  </label>
                </FormAccion>
                {v.status === "RETIRADA" && (
                  <p className="mt-1 text-xs text-muted">La llave queda como devuelta, pendiente de que la confirmen en la inmobiliaria.</p>
                )}
              </div>
            </details>
          )}
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Línea de tiempo</h2>
        <ol className="relative border-l border-border pl-5">
          {v.events.map((e) => (
            <li key={e.id} className="mb-4 last:mb-0">
              <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-accent" />
              <p className="text-sm font-medium text-foreground">
                {EVENTO_LABEL[e.type]}
                {e.note && <span className="font-normal text-muted"> — {e.note}</span>}
              </p>
              <p className="text-xs text-muted">
                {formatDateTime(e.at)} · @{e.by.username}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
