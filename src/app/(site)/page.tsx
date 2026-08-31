import Link from "next/link";
import { Hero } from "@/components/Hero";
import { PropertyCard } from "@/components/PropertyCard";
import { ServiciosSection } from "@/components/ServiciosSection";
import { PartnerLogosCarousel } from "@/components/PartnerLogosCarousel";
import { getFeaturedListings, getFilterOptions } from "@/lib/listings";
import { getActivePartnerLogos } from "@/lib/site";

export default async function HomePage() {
  const [featured, filterOptions, partnerLogos] = await Promise.all([
    getFeaturedListings(),
    getFilterOptions(),
    getActivePartnerLogos(),
  ]);

  return (
    <div>
      <Hero cities={filterOptions.cities} propertyTypes={filterOptions.propertyTypes} />

      <div className="mx-auto max-w-6xl px-6 py-16 flex flex-col gap-16">
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

        <ServiciosSection />

        <PartnerLogosCarousel logos={partnerLogos} />
      </div>
    </div>
  );
}
