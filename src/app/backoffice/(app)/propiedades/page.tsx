import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { ESTADOS, OPERACIONES, ORIGEN_LABEL, getPropiedades } from "@/lib/propiedades";
import { formatPrice, operationLabel } from "@/lib/format";
import { propertyImageSrc } from "@/lib/property-images";
import { SearchField } from "@/components/backoffice/SearchField";
import { EstadoPropiedadBadge } from "@/components/backoffice/EstadoPropiedadBadge";

interface PageProps {
  searchParams: Promise<{ q?: string; estado?: string; operacion?: string; origen?: string; publicada?: string; page?: string }>;
}

export default async function PropiedadesPage({ searchParams }: PageProps) {
  const profile = await requirePermission("propiedades.ver");
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const { items, total, totalPages } = await getPropiedades({ ...sp, page });
  const canEditar = profile.permissions.includes("propiedades.editar");

  const params = (p: number) => {
    const u = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "page" && v) as [string, string][]);
    u.set("page", String(p));
    return `?${u.toString()}`;
  };

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Propiedades</h1>
        {canEditar && (
          <Link
            href="/backoffice/propiedades/nueva"
            className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:bg-accent-strong"
          >
            Nueva propiedad
          </Link>
        )}
      </div>
      <p className="mb-6 text-sm text-muted">
        Ficha de cada propiedad: lo que se publica en el sitio y los datos internos (estado, captador, notas).
      </p>

      <form className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2">
          <SearchField defaultValue={sp.q} placeholder="Código, dirección o título..." />
        </div>
        <select name="estado" defaultValue={sp.estado ?? ""} className="field">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <select name="operacion" defaultValue={sp.operacion ?? ""} className="field">
          <option value="">Venta y alquiler</option>
          {OPERACIONES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select name="publicada" defaultValue={sp.publicada ?? ""} className="field">
          <option value="">Publicadas y no</option>
          <option value="si">Publicadas en el sitio</option>
          <option value="no">No publicadas</option>
        </select>
        <div className="flex gap-2">
          <select name="origen" defaultValue={sp.origen ?? ""} className="field flex-1">
            <option value="">Todo origen</option>
            <option value="ADINCO">Adinco</option>
            <option value="PROPIA">Propias</option>
          </select>
          <button type="submit" className="rounded-lg border border-border px-3 text-xs font-semibold hover:bg-surface cursor-pointer">
            Filtrar
          </button>
        </div>
      </form>

      <p className="mb-2 text-xs text-muted">{total} propiedad(es)</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted">No hay propiedades con esos filtros.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-3">Código</th>
                <th className="px-3 py-3">Propiedad</th>
                <th className="px-3 py-3">Operación</th>
                <th className="px-3 py-3">Precio</th>
                <th className="px-3 py-3">Estado</th>
                <th className="px-3 py-3">Captador</th>
                <th className="px-3 py-3">Sitio</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-3 py-2 text-muted">{p.code ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Link href={`/backoffice/propiedades/${p.id}`} className="flex items-center gap-3">
                      {p.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- miniatura ya en tamaño final
                        <img src={propertyImageSrc(p.images[0], "miniatura")} alt="" className="h-10 w-14 flex-none rounded object-cover" loading="lazy" />
                      ) : (
                        <span className="h-10 w-14 flex-none rounded bg-surface" />
                      )}
                      <span>
                        <span className="block font-medium text-foreground hover:underline">
                          {p.address ?? p.contentTitle ?? p.title}
                        </span>
                        <span className="text-xs text-muted">
                          {p.propertyType}
                          {p.city ? ` · ${p.city}` : ""} · {ORIGEN_LABEL[p.origin]}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted">{operationLabel(p.operationType)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted">
                    {formatPrice({ ...p, hidePrice: false })}
                    {p.hidePrice && <span className="ml-1 text-[10px] uppercase">(oculto)</span>}
                  </td>
                  <td className="px-3 py-2"><EstadoPropiedadBadge estado={p.status} /></td>
                  <td className="px-3 py-2 text-muted">{p.captadorAgent ? `@${p.captadorAgent.username}` : "Inmobiliaria"}</td>
                  <td className="px-3 py-2 text-xs">{p.isActive ? <span className="text-emerald-600">Publicada</span> : <span className="text-muted">No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          {page > 1 && <Link href={params(page - 1)} className="text-accent hover:underline">← Anterior</Link>}
          <span className="text-muted">Página {page} de {totalPages}</span>
          {page < totalPages && <Link href={params(page + 1)} className="text-accent hover:underline">Siguiente →</Link>}
        </div>
      )}
    </div>
  );
}
