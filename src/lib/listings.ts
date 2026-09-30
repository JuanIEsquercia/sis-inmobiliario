import { cache } from "react";
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
  // Listing.code (<code> del feed) — el código real que usa Adinco
  // para identificar la propiedad de cara al público (Listing.externalId
  // es <id>, un id interno de Adinco sin significado para nadie más, y
  // A PROPÓSITO se ignora acá). Coincidencia EXACTA, no `contains`: se
  // probó con contains y buscar "4" matcheaba cualquier código con un 4
  // en cualquier posición — un resultado inútil.
  code?: string;
  page?: number;
}

function buildWhere(filters: ListingFilters): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { isActive: true };

  if (filters.operationType) where.operationType = filters.operationType;
  if (filters.propertyType) where.propertyType = filters.propertyType;
  if (filters.city) where.city = filters.city;
  if (filters.rooms) where.rooms = { gte: filters.rooms };
  if (filters.code) where.code = filters.code.trim();
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
  // El identificador PÚBLICO de la propiedad: es el número que la
  // inmobiliaria le dicta al cliente y el que sale en el mensaje de
  // WhatsApp ("Código 345"). Las URLs del sitio van por acá, no por
  // `id` — ver getListingByCode.
  code: true,
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
// cache() de React (no next/cache) — dedupea dentro de un mismo request:
// generateMetadata y el propio componente de la página piden el mismo
// listing, y sin esto serían dos consultas a la base en vez de una.
// Busca por el CÓDIGO público (el de Adinco, el que se le dicta al
// cliente), que es lo que va en la URL del sitio. Antes la ficha se
// abría por `id`, la clave autoincremental interna de la tabla: como
// las propiedades entran y salen del feed, esos ids llegaron a 677
// habiendo solo 155 activas, así que la URL mostraba un número que no
// existía para nadie ("/propiedades/674" era el código 345) y además
// contradecía al mensaje de WhatsApp de esa misma página, que ya decía
// el código correcto.
// OJO: estas dos NO filtran por isActive. Traen la propiedad esté
// publicada o no, y quien llama decide qué hacer. Es a propósito: hay
// que poder distinguir "esta propiedad se dio de baja" de "este número
// no existió nunca", y con el filtro adentro las dos cosas llegaban
// como null. Para resolver una URL, usar resolveListingParam.
export const getListingByCode = cache(async (code: string) => {
  return withRetry(() =>
    prisma.listing.findFirst({
      where: { code },
      select: listingDetailSelect,
    })
  );
});

export const getListingById = cache(async (id: number) => {
  return withRetry(() => prisma.listing.findFirst({ where: { id }, select: listingDetailSelect }));
});

export type ListingDetail = Prisma.ListingGetPayload<{ select: typeof listingDetailSelect }>;

export type ListingResolution =
  | { estado: "ok"; listing: ListingDetail }
  | { estado: "redirigir"; code: string }
  | { estado: "no-disponible" }
  | { estado: "inexistente" };

// Resuelve el parámetro de /propiedades/{algo} a una propiedad.
//
// El parámetro es el CÓDIGO público (el que se le dicta al cliente).
// Pero códigos e ids internos son los dos números y comparten el mismo
// espacio: hoy hay 46 propiedades publicadas cuyo código coincide con el
// id interno de OTRA propiedad publicada. Por eso el orden importa y por
// eso el id es el último recurso, nunca el primero.
//
// El orden de abajo arregla un problema real: cuando una propiedad se
// daba de baja, su código dejaba de encontrarse y el sistema probaba el
// número como id interno — con lo cual el visitante terminaba
// REDIRIGIDO a una propiedad distinta, creyendo que era la que había
// pedido, y encima con un 308 permanente que el navegador se guarda.
// Pasó con tres códigos reales (45, 203 y 210, que llevaban a 112, 277 y
// 289). Ahora un código conocido que está dado de baja corta acá y
// devuelve "no-disponible": no se sigue buscando.
export const resolveListingParam = cache(async (param: string): Promise<ListingResolution> => {
  const porCodigo = await getListingByCode(param);
  if (porCodigo) {
    return porCodigo.isActive ? { estado: "ok", listing: porCodigo } : { estado: "no-disponible" };
  }

  // Recién acá, cuando el número NO es código de ninguna propiedad (ni
  // publicada ni dada de baja), se prueba como id interno. Es para los
  // links viejos, de cuando la URL llevaba el id: siguen funcionando y
  // se redirigen al código canónico.
  const numero = Number(param);
  if (!Number.isInteger(numero) || numero <= 0) return { estado: "inexistente" };

  const porId = await getListingById(numero);
  if (!porId) return { estado: "inexistente" };
  if (!porId.isActive) return { estado: "no-disponible" };

  // Con código, se redirige al canónico. Sin código (el feed no lo
  // trajo), no hay a dónde redirigir: se muestra acá mismo, para que la
  // propiedad no quede inalcanzable.
  return porId.code ? { estado: "redirigir", code: porId.code } : { estado: "ok", listing: porId };
});

// Un solo select compartido por la búsqueda por código (la normal) y la
// búsqueda por id (solo para redirigir links viejos), así las dos
// devuelven exactamente la misma forma.
const listingDetailSelect = {
  id: true,
  externalId: true,
  code: true,
  // Hace falta en el select porque las búsquedas de arriba ya no
  // filtran por estado: es lo que deja distinguir una propiedad dada de
  // baja de una que no existe.
  isActive: true,
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
} satisfies Prisma.ListingSelect;

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
