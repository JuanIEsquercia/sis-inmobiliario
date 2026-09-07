import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar } from "@/components/FilterBar";
import { PropertyCard } from "@/components/PropertyCard";
import { getFilterOptions, getListings } from "@/lib/listings";
import { operationLabel } from "@/lib/format";

interface PageSearchParams {
  operacion?: string;
  tipo?: string;
  ciudad?: string;
  precioMin?: string;
  precioMax?: string;
  dormitorios?: string;
  aptoCredito?: string;
  // Código de Adinco (Listing.externalId) — fuera del título/canónica
  // a propósito, mismo criterio que precio/dormitorios: es una búsqueda
  // puntual de una persona, no una categoría con intención de búsqueda
  // real que valga indexar aparte.
  codigo?: string;
  page?: string;
}

interface PageProps {
  searchParams: Promise<PageSearchParams>;
}

// Solo operación/tipo/ciudad arman título, descripción y URL canónica
// distintos — son los 3 filtros con intención de búsqueda real
// ("departamentos en alquiler en Corrientes"). Precio, dormitorios y
// página quedan afuera a propósito: si entraran, cada combinación de
// rango de precio armaría una URL "distinta" a ojos de Google compitiendo
// contra las demás por el mismo contenido — canonicalizar a la versión
// sin esos filtros evita diluir el posicionamiento entre variantes casi
// idénticas.
function buildFacetedMeta(sp: PageSearchParams): { title: string; description: string; canonical: string } {
  const opLabel = sp.operacion ? operationLabel(sp.operacion) : null;
  const tipo = sp.tipo || null;
  const ciudad = sp.ciudad || "Corrientes";

  const params = new URLSearchParams();
  if (sp.operacion) params.set("operacion", sp.operacion);
  if (sp.tipo) params.set("tipo", sp.tipo);
  if (sp.ciudad) params.set("ciudad", sp.ciudad);
  const canonical = params.size > 0 ? `/propiedades?${params.toString()}` : "/propiedades";

  if (!opLabel && !tipo && !sp.ciudad) {
    return {
      title: "Propiedades en Venta y Alquiler en Corrientes",
      description: "Catálogo completo de casas, departamentos, campos y terrenos en venta y alquiler en Corrientes.",
      canonical,
    };
  }

  const what = tipo ?? "Propiedades";
  const op = opLabel ? `en ${opLabel}` : "en Venta y Alquiler";
  const title = `${what} ${op} en ${ciudad}`;
  const description = `${what} ${op.toLowerCase()} en ${ciudad}, Corrientes. Filtrá por precio, dormitorios y más para encontrar la tuya.`;
  return { title, description, canonical };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const { title, description, canonical } = buildFacetedMeta(sp);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description },
  };
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
  if (sp.dormitorios) params.set("dormitorios", sp.dormitorios);
  if (sp.aptoCredito) params.set("aptoCredito", sp.aptoCredito);
  if (sp.codigo) params.set("codigo", sp.codigo);
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
      rooms: toNumber(sp.dormitorios),
      aptoCredito: sp.aptoCredito === "true" ? true : undefined,
      code: sp.codigo,
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

