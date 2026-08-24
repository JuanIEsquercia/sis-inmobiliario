// Espejo temporal de listings.ts que lee src/lib/preview-data.json en vez de
// Postgres, para poder ver el sitio con datos reales antes de tener Supabase
// conectado. Se borra junto con ese JSON cuando se conecta la DB real.
import raw from "./preview-data.json";
import type { NormalizedImage, NormalizedListing } from "./feed";

type PreviewListing = Omit<NormalizedListing, "rawData"> & { id: number };

const listings = raw as unknown as PreviewListing[];

const PAGE_SIZE = 12;

export interface ListingFilters {
  operationType?: string;
  propertyType?: string;
  city?: string;
  priceMin?: number;
  priceMax?: number;
  rooms?: number;
  page?: number;
}

function matches(listing: PreviewListing, filters: ListingFilters): boolean {
  if (filters.operationType && listing.operationType !== filters.operationType) return false;
  if (filters.propertyType && listing.propertyType !== filters.propertyType) return false;
  if (filters.city && listing.city !== filters.city) return false;
  if (filters.rooms && (listing.rooms ?? 0) < filters.rooms) return false;
  const price = listing.priceAmount ? Number(listing.priceAmount) : null;
  if (filters.priceMin && (price === null || price < filters.priceMin)) return false;
  if (filters.priceMax && (price === null || price > filters.priceMax)) return false;
  return true;
}

function byRecency(a: PreviewListing, b: PreviewListing): number {
  return new Date(b.sourceUpdatedAt ?? 0).getTime() - new Date(a.sourceUpdatedAt ?? 0).getTime();
}

function featuredImage(images: NormalizedImage[]): { url: string }[] {
  const featured = images.find((img) => img.isFeatured) ?? images[0];
  return featured ? [{ url: featured.url }] : [];
}

function toCard(listing: PreviewListing) {
  return {
    id: listing.id,
    externalId: listing.externalId,
    title: listing.title,
    operationType: listing.operationType,
    propertyType: listing.propertyType,
    priceAmount: listing.priceAmount,
    priceCurrency: listing.priceCurrency,
    priceRaw: listing.priceRaw,
    city: listing.city,
    region: listing.region,
    rooms: listing.rooms,
    bathrooms: listing.bathrooms,
    plotArea: listing.plotArea,
    floorArea: listing.floorArea,
    images: featuredImage(listing.images),
  };
}

export async function getListings(filters: ListingFilters) {
  const filtered = listings.filter((l) => matches(l, filters));
  const page = Math.max(1, filters.page ?? 1);
  const total = filtered.length;
  const items = [...filtered]
    .sort(byRecency)
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map(toCard);

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getFeaturedListings(take = 6) {
  return [...listings].sort(byRecency).slice(0, take).map(toCard);
}

export async function getListingById(id: number) {
  return listings.find((l) => l.id === id) ?? null;
}

export async function getFilterOptions() {
  const cities = [...new Set(listings.map((l) => l.city).filter((c): c is string => !!c))].sort();
  const propertyTypes = [...new Set(listings.map((l) => l.propertyType))].sort();
  return { cities, propertyTypes };
}
