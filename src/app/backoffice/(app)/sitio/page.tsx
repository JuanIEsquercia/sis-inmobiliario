import Image from "next/image";
import { requirePermission } from "@/lib/auth";
import { getAllPartnerLogos } from "@/lib/site";
import { crearMarca, actualizarMarca, eliminarMarca } from "./actions";

export default async function SitioPage() {
  await requirePermission("sitio.gestionar");
  const logos = await getAllPartnerLogos();

  return (
    <div className="max-w-6xl w-full mx-auto">
      <h1 className="mb-1 text-xl font-semibold text-foreground">Sitio público</h1>
      <p className="mb-6 text-sm text-muted">
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
