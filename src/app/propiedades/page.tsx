import Link from "next/link";
import { FilterBar } from "@/components/FilterBar";
import { PropertyCard } from "@/components/PropertyCard";
// TODO(preview): volver a "@/lib/listings" cuando Supabase esté conectado.
import { getFilterOptions, getListings } from "@/lib/listings.preview";

interface PageProps {
  searchParams: Promise<{
    operacion?: string;
    tipo?: string;
    ciudad?: string;
    precioMin?: string;
    precioMax?: string;
    ambientes?: string;
    page?: string;
  }>;
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function buildPageHref(sp: Awaited<PageProps["searchParams"]>, page: number): string {
  const params = new URLSearchParams();
  if (sp.operacion) params.set("operacion", sp.operacion);
  if (sp.tipo) params.set("tipo", sp.tipo);
  if (sp.ciudad) params.set("ciudad", sp.ciudad);
  if (sp.precioMin) params.set("precioMin", sp.precioMin);
  if (sp.precioMax) params.set("precioMax", sp.precioMax);
  if (sp.ambientes) params.set("ambientes", sp.ambientes);
  params.set("page", String(page));
  return `/propiedades?${params.toString()}`;
}

export default async function PropiedadesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filterOptions = await getFilterOptions();

  const { items, total, page, totalPages } = await getListings({
    operationType: sp.operacion,
    propertyType: sp.tipo,
    city: sp.ciudad,
    priceMin: toNumber(sp.precioMin),
    priceMax: toNumber(sp.precioMax),
    rooms: toNumber(sp.ambientes),
    page: toNumber(sp.page),
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">Propiedades</h1>

      <div className="mb-8">
        <FilterBar
          action="/propiedades"
          cities={filterOptions.cities}
          propertyTypes={filterOptions.propertyTypes}
          defaults={sp}
        />
      </div>

      <p className="mb-4 text-sm text-muted">{total} propiedades encontradas</p>

      {items.length === 0 ? (
        <p className="text-sm text-muted">No hay propiedades que coincidan con esos filtros.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((listing) => (
            <PropertyCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildPageHref(sp, p)}
              className={`rounded-lg px-3 py-1.5 ${
                p === page ? "bg-accent text-accent-foreground" : "border border-border text-foreground"
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
