import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getUnitById, clientLabel } from "@/lib/alquileres";
import { ActionForm } from "@/components/backoffice/ActionForm";
import { ConfirmDeleteButton } from "@/components/backoffice/ConfirmDeleteButton";
import { actualizarUnidad, eliminarUnidad } from "../actions";

// Incluye BORRADOR/FIRMADO (colocaciones, ver comentario en
// ContractStatus) — el historial de la unidad no filtra por
// isAdministered, así que una colocación sí puede aparecer acá, y sin
// esas dos claves el badge de estado quedaba en blanco para ella.
const statusLabels: Record<string, string> = {
  BORRADOR: "Borrador",
  FIRMADO: "Firmado",
  ACTIVO: "Activo",
  FINALIZADO: "Finalizado",
  RESCINDIDO: "Rescindido",
  ANULADO: "Anulado",
};

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HistorialUnidadPage({ params }: PageProps) {
  const profile = await requirePermission("historial.ver");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const unit = await getUnitById(numericId);
  if (!unit) notFound();

  const canEditar = profile.permissions.includes("historial.editar");
  const sinOperaciones = unit.contracts.length + unit.sales.length + unit.appraisals.length === 0;

  return (
    <div className="max-w-6xl w-full mx-auto">
      <Link href="/backoffice/historial" className="mb-2 inline-block text-xs text-accent hover:underline">
        ← Historial de propiedades
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">{unit.address}</h1>
        {canEditar && sinOperaciones && (
          <ConfirmDeleteButton
            mensajeExito="Propiedad eliminada"
            action={eliminarUnidad.bind(null, unit.id)}
            triggerLabel="Eliminar propiedad"
            title="¿Eliminar esta propiedad?"
            description={`Se borra definitivamente ${unit.address} (código ${unit.propertyCode}). No tiene contratos, ventas ni tasaciones: usalo para pruebas o cargas repetidas.`}
          />
        )}
      </div>
      <p className="mb-6 text-sm text-muted">
        Código {unit.propertyCode}
        {unit.city ? ` · ${unit.city}` : ""}
        {unit.propertyType ? ` · ${unit.propertyType}` : ""}
      </p>

      {canEditar && (
        <details className="mb-8 rounded-lg border border-border p-3 text-sm">
          <summary className="cursor-pointer font-medium text-foreground">Corregir datos de la propiedad</summary>
          <p className="mt-2 text-xs text-muted">
            El cambio se ve en todos sus contratos, ventas y tasaciones. No modifica la publicación del sitio web.
          </p>
          <ActionForm
            action={actualizarUnidad.bind(null, unit.id)}
            mensajeExito="Propiedad actualizada"
            className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs text-muted">Dirección*</span>
              <input name="address" required defaultValue={unit.address} className="field" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Código de propiedad*</span>
              <input name="propertyCode" required defaultValue={unit.propertyCode} className="field" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Localidad</span>
              <input name="city" defaultValue={unit.city ?? ""} className="field" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">Tipo de propiedad</span>
              <input name="propertyType" defaultValue={unit.propertyType ?? ""} className="field" placeholder="Departamento, casa, local..." />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs text-muted">Notas</span>
              <textarea name="notes" rows={2} defaultValue={unit.notes ?? ""} className="field" />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:bg-accent-strong cursor-pointer"
              >
                Guardar cambios
              </button>
            </div>
          </ActionForm>
        </details>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Contratos de alquiler</h2>
        {unit.contracts.length === 0 ? (
          <p className="text-sm text-muted">Todavía no tuvo contratos de alquiler.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {unit.contracts.map((c) => (
              <li key={c.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Link href={`/backoffice/administraciones/${c.id}`} className="font-medium text-foreground hover:underline">
                    {fmtDate.format(c.startDate)} — {fmtDate.format(c.endDate)}
                  </Link>
                  <span className="text-xs text-muted">{statusLabels[c.status]}</span>
                </div>
                <p className="text-muted">
                  Inquilino: {clientLabel(c.tenant)} · Propietario: {clientLabel(c.owner)}
                </p>
                <p className="text-muted">
                  Alquiler: {c.currency} {fmtMoney(Number(c.rentAmount))}
                  {c.lastIndexedAt && ` (última actualización ${fmtDate.format(c.lastIndexedAt)})`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Ventas</h2>
        {unit.sales.length === 0 ? (
          <p className="text-sm text-muted">Todavía no se vendió a través de la inmobiliaria.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {unit.sales.map((s) => (
              <li key={s.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Link href={`/backoffice/caja/ventas/${s.id}`} className="font-medium text-foreground hover:underline">
                    {fmtDate.format(s.closedAt)}
                  </Link>
                  {s.saleAmount && (
                    <span className="text-muted">
                      {s.currency} {fmtMoney(Number(s.saleAmount))}
                    </span>
                  )}
                </div>
                {(s.seller || s.buyer) && (
                  <p className="text-muted">
                    {s.seller && `Vendedor: ${s.seller.firstName} ${s.seller.lastName}`}
                    {s.seller && s.buyer && " · "}
                    {s.buyer && `Comprador: ${s.buyer.firstName} ${s.buyer.lastName}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Tasaciones</h2>
        {unit.appraisals.length === 0 ? (
          <p className="text-sm text-muted">Todavía no se tasó a través de la inmobiliaria.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {unit.appraisals.map((a) => (
              <li key={a.id} className="rounded-lg border border-border p-3 text-sm flex items-center justify-between">
                <span className="text-foreground">{fmtDate.format(a.completedAt)}</span>
                <span className="text-muted">
                  {a.currency} {fmtMoney(Number(a.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
