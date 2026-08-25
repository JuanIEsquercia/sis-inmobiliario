import Image from "next/image";
import Link from "next/link";
import { formatArea, formatPrice, operationLabel } from "@/lib/format";

export interface PropertyCardListing {
  id: number;
  title: string;
  operationType: string;
  propertyType: string;
  priceAmount: unknown;
  priceCurrency: string | null;
  priceRaw: string | null;
  city: string | null;
  region: string | null;
  rooms: number | null;
  bathrooms: number | null;
  plotArea: unknown;
  floorArea: unknown;
  images: { url: string }[];
}

export function PropertyCard({ listing }: { listing: PropertyCardListing }) {
  const image = listing.images[0]?.url;
  const area = formatArea(listing.plotArea) ?? formatArea(listing.floorArea);
  const location = [listing.city, listing.region].filter(Boolean).join(", ");

  return (
    <Link
      href={`/propiedades/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-premium"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-background">
        {image ? (
          <Image
            src={image}
            alt={listing.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">Sin foto</div>
        )}
        <span className="absolute left-4 top-4 rounded-lg bg-background/90 backdrop-blur-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground shadow-sm">
          {operationLabel(listing.operationType)}
        </span>
      </div>
      
      <div className="flex flex-1 flex-col p-5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
          {listing.propertyType}
        </span>
        
        <h3 className="line-clamp-2 text-base font-semibold text-foreground group-hover:text-accent transition-colors duration-250 mt-1 min-h-[3rem] leading-snug">
          {listing.title}
        </h3>
        
        <div className="flex items-center gap-1 text-xs text-muted mt-1.5">
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="flex-none text-muted/80"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          <span className="truncate">{location || "Ubicación a consultar"}</span>
        </div>

        <div className="mt-4 border-t border-border/40 pt-4 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-accent-strong dark:text-accent">
            {formatPrice(listing)}
          </span>
          
          <div className="flex items-center gap-3 text-xs text-muted font-medium">
            {listing.rooms && (
              <span className="flex items-center gap-1" title="Ambientes">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
                {listing.rooms} <span className="opacity-70">amb</span>
              </span>
            )}
            {area && (
              <span className="flex items-center gap-1" title="Superficie">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v16.5m0-16.5h16.5M3.75 3.75l16.5 16.5M3.75 20.25h16.5M20.25 3.75v16.5" />
                </svg>
                {area}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

