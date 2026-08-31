import Link from "next/link";
import { FilterBar } from "@/components/FilterBar";
import { PropertyCard } from "@/components/PropertyCard";
import { getFilterOptions, getListings } from "@/lib/listings";

interface PageProps {
  searchParams: Promise<{
    operacion?: string;
    tipo?: string;
    ciudad?: string;
    precioMin?: string;
    precioMax?: string;
    ambientes?: string;
    aptoCredito?: string;
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
  if (sp.aptoCredito) params.set("aptoCredito", sp.aptoCredito);
  params.set("page", String(page));
  return `/propiedades?${params.toString()}`;
}

export default async function PropiedadesPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  // getFilterOptions (para las opciones del combo) no depende del
  // resultado de getListings ni viceversa — misma idea que en la
  // auditoría de rendimiento: independientes, se piden juntas.
  const [filterOptions, { items, total, page, totalPages }] = await Promise.all([
    getFilterOptions(),
    getListings({
      operationType: sp.operacion,
      propertyType: sp.tipo,
      city: sp.ciudad,
      priceMin: toNumber(sp.precioMin),
      priceMax: toNumber(sp.precioMax),
      rooms: toNumber(sp.ambientes),
      aptoCredito: sp.aptoCredito === "true" ? true : undefined,
      page: toNumber(sp.page),
    }),
  ]);

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
        <nav className="mt-12 flex items-center justify-center gap-2 text-sm font-medium">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildPageHref(sp, p)}
              className={`rounded-xl px-4 py-2 transition-all duration-200 cursor-pointer ${
                p === page
                  ? "bg-accent text-accent-foreground shadow-md shadow-accent/10 scale-95"
                  : "border border-border/60 bg-surface text-foreground hover:border-accent/40 hover:text-accent"
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

