import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getAgents } from "@/lib/caja";
import { ESTADOS, ESTADOS_NO_PUBLICABLES, ORIGEN_LABEL, getPropiedadById } from "@/lib/propiedades";
import { formatArea, formatDate, formatPrice, operationLabel } from "@/lib/format";
import { MAX_FOTOS_POR_PROPIEDAD, propertyImageSrc } from "@/lib/property-images";
import { ActionForm } from "@/components/backoffice/ActionForm";
import { AgentSelect } from "@/components/backoffice/AgentSelect";
import { SubmitButton } from "@/components/backoffice/SubmitButton";
import { EstadoPropiedadBadge } from "@/components/backoffice/EstadoPropiedadBadge";
import { PropiedadFotos } from "@/components/backoffice/PropiedadFotos";
import { PropiedadPublicacionFields } from "@/components/backoffice/PropiedadPublicacionFields";
import { actualizarDatosInternos, actualizarPublicacion, convertirAPropia, publicarPropiedad } from "../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

const boton = "rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:bg-accent-strong cursor-pointer";
const botonSecundario = "rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:bg-surface cursor-pointer";

function Dato({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export default async function PropiedadPage({ params }: PageProps) {
  const profile = await requirePermission("propiedades.ver");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const data = await getPropiedadById(numericId);
  if (!data) notFound();
  const { listing: p, historial, captadorSugerido } = data;

  const canEditar = profile.permissions.includes("propiedades.editar");
  const canPublicar = profile.permissions.includes("propiedades.publicar");
  const canHistorial = profile.permissions.includes("historial.ver");
  const esPropia = p.origin === "PROPIA";
  const agents = canEditar ? await getAgents() : [];
  const titulo = p.contentTitle ?? p.title;

  // Mientras sea de Adinco se muestran solo las fotos con copia propia si
  // ya las tiene (como el sitio), si no las de Adinco.
  const conCopia = p.images.filter((i) => i.storagePath);
  const fotos = (conCopia.length > 0 ? conCopia : p.images).map((i) => ({
    id: i.id,
    src: propertyImageSrc(i, "tarjeta"),
    propia: Boolean(i.storagePath),
  }));

  return (
    <div className="max-w-6xl w-full mx-auto">
      <Link href="/backoffice/propiedades" className="mb-2 inline-block text-xs text-accent hover:underline">
        ← Propiedades
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{p.address ?? titulo}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="font-semibold text-foreground">Código {p.code ?? "—"}</span>
            <EstadoPropiedadBadge estado={p.status} />
            <span>· {operationLabel(p.operationType)} · {p.propertyType}</span>
            <span>· Origen: {ORIGEN_LABEL[p.origin]}</span>
            <span>· {p.isActive ? <span className="text-emerald-600">Publicada en el sitio</span> : "No publicada"}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.isActive && p.code && (
            <Link href={`/propiedades/${p.code}`} target="_blank" className={botonSecundario}>
              Ver en el sitio ↗
            </Link>
          )}
          {esPropia && canPublicar && (
            <ActionForm
              action={publicarPropiedad.bind(null, p.id, !p.isActive)}
              mensajeExito={p.isActive ? "Propiedad despublicada" : "Propiedad publicada"}
            >
              <SubmitButton className={p.isActive ? botonSecundario : boton}>
                {p.isActive ? "Despublicar" : "Publicar en el sitio"}
              </SubmitButton>
            </ActionForm>
          )}
        </div>
      </div>

      {!esPropia && (
        <p className="mt-4 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
          Esta ficha viene de Adinco: precio, descripción, fotos y publicación se siguen editando en Adinco hasta el corte
          (el sync de cada día los actualiza). Acá se cargan los datos internos.
        </p>
      )}
      {esPropia && !p.isActive && ESTADOS_NO_PUBLICABLES.includes(p.status) && (
        <p className="mt-4 text-xs text-muted">No se puede publicar mientras esté {p.status.toLowerCase()}.</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold text-foreground">Fotos</h2>
          <PropiedadFotos listingId={p.id} fotos={fotos} editable={esPropia && canEditar} maximo={MAX_FOTOS_POR_PROPIEDAD} />
        </section>

        <section className="rounded-xl border border-border p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">Datos internos</h2>
          {canEditar ? (
            <ActionForm action={actualizarDatosInternos.bind(null, p.id)} mensajeExito="Datos guardados" className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Estado comercial</span>
                <select name="status" defaultValue={p.status} className="field">
                  {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </label>
              <AgentSelect
                agents={agents}
                name="captadorAgentId"
                label="Captador"
                required={false}
                defaultValue={p.captadorAgentId ?? captadorSugerido?.id}
              />
              {!p.captadorAgentId && captadorSugerido && (
                <p className="-mt-1 text-xs text-muted">
                  Sugerido por Adinco (vendedor del aviso): @{captadorSugerido.username}. Se guarda al apretar Guardar.
                </p>
              )}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Notas internas</span>
                <textarea name="internalNotes" rows={3} defaultValue={p.internalNotes ?? ""} className="field" />
              </label>
              <p className="text-xs text-muted">Vendida, alquilada o suspendida la saca del sitio al guardar.</p>
              <div>
                <SubmitButton className={boton}>Guardar</SubmitButton>
              </div>
            </ActionForm>
          ) : (
            <dl className="flex flex-col gap-2">
              <Dato label="Captador" value={p.captadorAgent ? `@${p.captadorAgent.username}` : "Inmobiliaria"} />
              <Dato label="Notas internas" value={p.internalNotes} />
            </dl>
          )}
          <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
            <Dato label="Estado desde" value={formatDate(p.statusChangedAt)} />
            <Dato label="Cargada por" value={p.createdBy ? `@${p.createdBy.username}` : null} />
            <Dato label="Vendedor en Adinco" value={p.sellerName} />
            <Dato label="Última actualización del aviso" value={formatDate(p.sourceUpdatedAt)} />
          </dl>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-foreground">Publicación</h2>
        {esPropia && canEditar ? (
          <ActionForm action={actualizarPublicacion.bind(null, p.id)} mensajeExito="Publicación actualizada" className="flex flex-col gap-6">
            <PropiedadPublicacionFields d={p} />
            <div>
              <SubmitButton className={boton}>Guardar publicación</SubmitButton>
            </div>
          </ActionForm>
        ) : (
          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 font-medium text-foreground">{titulo}</p>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Dato label="Precio" value={formatPrice(p)} />
              <Dato label="Expensas" value={p.expenses ? `ARS ${Number(p.expenses).toLocaleString("es-AR")}` : null} />
              <Dato label="Localidad" value={[p.neighborhood, p.city, p.region].filter(Boolean).join(", ")} />
              <Dato label="Sup. cubierta" value={formatArea(p.floorArea)} />
              <Dato label="Sup. terreno" value={formatArea(p.plotArea)} />
              <Dato label="Dormitorios" value={p.rooms} />
              <Dato label="Baños" value={p.bathrooms} />
              <Dato label="Cocheras" value={p.coveredGarages} />
            </dl>
            {p.description && <p className="mt-4 whitespace-pre-line text-sm text-muted">{p.description}</p>}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-base font-semibold text-foreground">Operaciones en el Historial</h2>
        <p className="mb-3 text-xs text-muted">
          Contratos, ventas y tasaciones cargados con este código (incluye códigos como &quot;GARC1-{p.code}&quot;).
        </p>
        {historial.length === 0 ? (
          <p className="text-sm text-muted">No hay operaciones cargadas con este código.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {historial.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                <span>
                  {canHistorial ? (
                    <Link href={`/backoffice/historial/${u.id}`} className="font-medium text-foreground hover:underline">
                      {u.address}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">{u.address}</span>
                  )}
                  <span className="ml-2 text-muted">código cargado: {u.propertyCode}</span>
                </span>
                <span className="text-xs text-muted">
                  {u._count.contracts} contrato(s) · {u._count.sales} venta(s) · {u._count.appraisals} tasación(es)
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!esPropia && canEditar && canPublicar && (
        <details className="mt-8 rounded-lg border border-border p-3 text-sm">
          <summary className="cursor-pointer font-medium text-foreground">Pasar a ficha propia</summary>
          <p className="mt-2 text-xs text-muted">
            Desde ahí el sync de Adinco deja de actualizarla y se edita completa desde acá (datos, fotos y publicación). Es el
            paso del corte con Adinco. Las fotos sin copia propia se quitan de la ficha (siguen en el respaldo).
          </p>
          <ActionForm action={convertirAPropia.bind(null, p.id)} mensajeExito="Ahora es una ficha propia" className="mt-3">
            <SubmitButton className={botonSecundario}>Pasar a propia</SubmitButton>
          </ActionForm>
        </details>
      )}
    </div>
  );
}
