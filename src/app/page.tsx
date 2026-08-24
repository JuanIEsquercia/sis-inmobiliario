import Link from "next/link";
import { FilterBar } from "@/components/FilterBar";
import { PropertyCard } from "@/components/PropertyCard";
// TODO(preview): volver a "@/lib/listings" cuando Supabase esté conectado.
import { getFeaturedListings, getFilterOptions } from "@/lib/listings.preview";

export default async function HomePage() {
  const [featured, filterOptions] = await Promise.all([getFeaturedListings(), getFilterOptions()]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <section className="mb-10">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-foreground">
          Encontrá tu próxima propiedad en Corrientes
        </h1>
        <p className="mb-6 text-muted">Casas, departamentos, campos y terrenos en venta y alquiler.</p>
        <FilterBar
          action="/propiedades"
          cities={filterOptions.cities}
          propertyTypes={filterOptions.propertyTypes}
          defaults={{}}
        />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Publicadas recientemente</h2>
          <Link href="/propiedades" className="text-sm text-accent hover:underline">
            Ver todas
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay propiedades sincronizadas.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((listing) => (
              <PropertyCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
