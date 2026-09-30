import Image from "next/image";
import { requirePermission } from "@/lib/auth";
import { getAllPartnerLogos, getSyncState } from "@/lib/site";
import { FormWithFeedback } from "@/components/backoffice/FormWithFeedback";
import { formatDateTime } from "@/lib/format";
import { crearMarca, actualizarMarca, eliminarMarca, sincronizarFeed } from "./actions";

// La pantalla no se cachea: si se cacheara, después de sincronizar
// seguiría mostrando la fecha vieja.
export const dynamic = "force-dynamic";

export default async function SitioPage() {
  await requirePermission("sitio.gestionar");
  const [logos, sync] = await Promise.all([getAllPartnerLogos(), getSyncState()]);

  return (
    <div className="max-w-6xl w-full mx-auto">
      <h1 className="mb-1 text-xl font-semibold text-foreground">Sitio público</h1>
      <p className="mb-6 text-sm text-muted">
        Sincronización del catálogo con Adinco y logos de marcas de la portada.
      </p>

      <section className="mb-8 rounded-xl border border-border p-5">
        <h2 className="mb-1 text-sm font-medium text-foreground">Catálogo de propiedades</h2>
        <p className="mb-4 text-sm text-muted">
          Las propiedades del sitio se traen del archivo que publica Adinco. Se sincroniza solo, todos los días a las
          18:00. Usá el botón si cargaste algo en Adinco y lo querés ver publicado ahora mismo.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Última sincronización:</span>
          {sync.lastSyncedAt ? (
            <span className={`font-semibold ${sync.atrasado ? "text-destructive" : "text-foreground"}`}>
              {formatDateTime(sync.lastSyncedAt)}
            </span>
          ) : (
            <span className="font-semibold text-destructive">nunca</span>
          )}
          {sync.atrasado && (
            <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
              Atrasada
            </span>
          )}
        </div>

        <FormWithFeedback
          action={sincronizarFeed}
          submitLabel="Sincronizar ahora"
          pendingLabel="Sincronizando... (puede tardar hasta un minuto)"
          submitClassName="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          {/* Sin campos: el formulario es solo el botón. El children es
              obligatorio en FormWithFeedback, así que va vacío. */}
          <></>
        </FormWithFeedback>
      </section>

      <h2 className="mb-1 text-sm font-medium text-foreground">Marcas de la portada</h2>
      <p className="mb-4 text-sm text-muted">
        Logos de marcas y servicios que aparecen en el carrusel de confianza de la portada (Adinco, Argenprop, etc.).
        Solo se muestran las marcadas como activas, en el orden indicado.
      </p>

      {logos.length === 0 ? (
        <p className="mb-8 text-sm text-muted">Todavía no hay logos cargados.</p>
      ) : (
        <div className="mb-8 flex flex-col gap-3">
          {logos.map((logo) => (
            <div key={logo.id} className="flex items-center gap-4 rounded-xl border border-border p-4">
              <div className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
                <Image src={logo.imageUrl} alt={logo.name} width={56} height={56} className="h-full w-full object-contain" unoptimized />
              </div>

              <form action={actualizarMarca.bind(null, logo.id)} className="flex flex-1 flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">Nombre</label>
                  <input name="name" defaultValue={logo.name} required className="field text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">Link (opcional)</label>
                  <input name="linkUrl" type="url" defaultValue={logo.linkUrl ?? ""} placeholder="https://..." className="field text-sm w-48" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted">Orden</label>
                  <input name="sortOrder" type="number" defaultValue={logo.sortOrder} className="field w-20 text-sm" />
                </div>
                <label className="flex items-center gap-1.5 pb-2 text-xs text-muted">
                  <input type="checkbox" name="isActive" defaultChecked={logo.isActive} className="h-3.5 w-3.5 accent-accent" />
                  Activo
                </label>
                <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface">
                  Guardar
                </button>
              </form>

              <form action={eliminarMarca.bind(null, logo.id)}>
                <button type="submit" className="text-xs font-medium text-accent hover:underline">
                  Eliminar
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <section className="rounded-xl border border-dashed border-border p-5">
        <h2 className="mb-3 text-sm font-medium text-foreground">Agregar marca</h2>
        <form action={crearMarca} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-xs text-muted">
              Nombre*
            </label>
            <input id="name" name="name" required className="field" placeholder="Adinco" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="linkUrl" className="text-xs text-muted">
              Link (opcional)
            </label>
            <input id="linkUrl" name="linkUrl" type="url" className="field w-56" placeholder="https://..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sortOrder" className="text-xs text-muted">
              Orden
            </label>
            <input id="sortOrder" name="sortOrder" type="number" defaultValue={0} className="field w-20" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="file" className="text-xs text-muted">
              Imagen (PNG/JPG/WEBP/SVG, máx. 2MB)
            </label>
            <input id="file" name="file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" required className="field" />
          </div>
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong">
            Agregar
          </button>
        </form>
      </section>
    </div>
  );
}
