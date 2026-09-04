import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { PROPERTY_TYPES } from "@/lib/property-types";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 12;

export interface ListingFilters {
  operationType?: string;
  propertyType?: string;
  city?: string;
  priceMin?: number;
  priceMax?: number;
  // Pese al nombre (viene del tag <rooms> del feed de Adinco), este dato
  // es la cantidad de DORMITORIOS de la propiedad, no de ambientes —
  // confirmado contra el feed real: coincide siempre con lo que dice el
  // título/descripción ("3 dormitorios" → rooms=3). El feed tiene un tag
  // <ambients> aparte que Adinco nunca completa (siempre vacío), así que
  // no hay forma de mostrar "ambientes" real — se filtra/etiqueta como
  // dormitorios en toda la UI pública para no prometer un dato que no es.
  rooms?: number;
  aptoCredito?: boolean;
  page?: number;
}

function buildWhere(filters: ListingFilters): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { isActive: true };

  if (filters.operationType) where.operationType = filters.operationType;
  if (filters.propertyType) where.propertyType = filters.propertyType;
  if (filters.city) where.city = filters.city;
  if (filters.rooms) where.rooms = { gte: filters.rooms };
  // Sin marcar, no filtra (se ven aptas y no aptas) — marcado, solo las
  // que el feed mandó explícitamente en true (no las que vinieron null).
  if (filters.aptoCredito) where.aptoCredito = true;
  if (filters.priceMin || filters.priceMax) {
    where.priceAmount = {
      ...(filters.priceMin ? { gte: filters.priceMin } : {}),
      ...(filters.priceMax ? { lte: filters.priceMax } : {}),
    };
  }

  return where;
}

const listingCardSelect = {
  id: true,
  externalId: true,
  title: true,
  contentTitle: true,
  operationType: true,
  propertyType: true,
  priceAmount: true,
  priceCurrency: true,
  priceRaw: true,
  city: true,
  region: true,
  rooms: true,
  bathrooms: true,
  plotArea: true,
  floorArea: true,
  images: {
    where: { isFeatured: true },
    take: 1,
    select: { url: true },
  },
} satisfies Prisma.ListingSelect;

export type ListingCard = Prisma.ListingGetPayload<{ select: typeof listingCardSelect }>;

export async function getListings(filters: ListingFilters) {
  const where = buildWhere(filters);
  const page = Math.max(1, filters.page ?? 1);

  const [total, items] = await withRetry(() =>
    Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        select: listingCardSelect,
        orderBy: { sourceUpdatedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ])
  );

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getFeaturedListings(take = 6) {
  return withRetry(() =>
    prisma.listing.findMany({
      where: { isActive: true },
      select: listingCardSelect,
      orderBy: { sourceUpdatedAt: "desc" },
      take,
    })
  );
}

// Select explícito, no `include` — a propósito nunca trae sellerName/
// sellerEmail (datos personales de quien cargó el aviso en Adinco, no
// para publicar) ni rawData (el <ad> crudo del feed, que los repite y
// puede traer más campos no modelados). Es la ficha pública: que un
// campo nuevo se agregue acá tiene que ser una decisión explícita, no
// un efecto secundario de traer todo con include.
export async function getListingById(id: number) {
  return withRetry(() =>
    prisma.listing.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        externalId: true,
        title: true,
        contentTitle: true,
        description: true,
        operationType: true,
        propertyType: true,
        priceAmount: true,
        priceCurrency: true,
        priceRaw: true,
        pricePerHectare: true,
        expenses: true,
        address: true,
        region: true,
        city: true,
        latitude: true,
        longitude: true,
        floorArea: true,
        plotArea: true,
        landArea: true,
        rooms: true,
        bathrooms: true,
        condition: true,
        year: true,
        buildingFloors: true,
        buildingMainElevators: true,
        buildingCategory: true,
        coveredGarages: true,
        aptoCredito: true,
        fieldLength: true,
        fieldWidth: true,
        countryType: true,
        services: true,
        otherData: true,
        sourceUpdatedAt: true,
        images: { orderBy: { sortOrder: "asc" } },
        videos: true,
      },
    })
  );
}

export async function getFilterOptions() {
  const cities = await withRetry(() =>
    prisma.listing.findMany({
      where: { isActive: true, city: { not: null } },
      select: { city: true },
      distinct: ["city"],
      orderBy: { city: "asc" },
    })
  );

  return {
    cities: cities.map((c) => c.city).filter((c): c is string => !!c),
    // Lista fija (categorías del feed de Adinco), no derivada de lo que
    // haya publicado actualmente — así el filtro no "desaparece"
    // opciones cuando no hay stock de ese tipo en un momento dado.
    propertyTypes: PROPERTY_TYPES as unknown as string[],
  };
}
