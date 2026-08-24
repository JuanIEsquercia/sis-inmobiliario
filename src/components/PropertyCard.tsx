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

  return (
    <Link
      href={`/propiedades/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-background transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
        {image ? (
          <Image
            src={image}
            alt={listing.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">Sin foto</div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground">
          {operationLabel(listing.operationType)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs uppercase tracking-wide text-muted">{listing.propertyType}</span>
        <h3 className="line-clamp-2 text-sm font-medium text-foreground">{listing.title}</h3>
        <p className="text-xs text-muted">
          {[listing.city, listing.region].filter(Boolean).join(", ") || "Ubicación a consultar"}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-base font-semibold text-accent">{formatPrice(listing)}</span>
          <span className="text-xs text-muted">
            {[listing.rooms ? `${listing.rooms} amb.` : null, area].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>
    </Link>
  );
}
