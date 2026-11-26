// Datos estructurados (schema.org en JSON-LD) del sitio público.
//
// Es lo que Google lee para entender de qué trata cada página (y armar
// el Knowledge Graph, las migas de pan, el nombre del sitio), y lo que
// los buscadores con IA (ChatGPT, Perplexity, Gemini, AI Overviews)
// usan para citar precio, ubicación y características con la fuente
// correcta. Todo en un solo lugar para que la inmobiliaria se describa
// igual en todas las páginas y cada propiedad apunte a su URL real.
//
// Regla: solo datos que existen en la base o en lib/seo.ts. Nada
// inventado (ni coordenadas de la oficina, ni rango de precios): un
// dato estructurado falso es peor que uno ausente.
import type { ListingCard, ListingDetail } from "@/lib/listings";
import { operationLabel } from "@/lib/format";
import { SITE_URL, SITE_NAME, BUSINESS, absoluteUrl } from "@/lib/seo";

// Identificadores estables para que las piezas se referencien entre sí
// (la oferta de una propiedad apunta a la inmobiliaria por @id en vez
// de repetirla entera).
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

// URL pública de una propiedad: SIEMPRE por código, igual que la ruta.
// Antes los datos estructurados usaban el id interno de la tabla, que
// redirige: Google y las IAs recibían una URL "oficial" distinta de la
// de la página.
export function listingPath(code: string): string {
  return `/propiedades/${encodeURIComponent(code)}`;
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    // RealEstateAgent es un LocalBusiness: alimenta el Knowledge Graph y
    // la ficha local. Tiene que decir exactamente lo mismo que el perfil
    // de Google Business (nombre, dirección, teléfono, horario).
    "@type": "RealEstateAgent",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: "García Propiedades",
    url: SITE_URL,
    logo: absoluteUrl("/logo-light.png"),
    image: absoluteUrl("/logo-light.png"),
    description:
      "Inmobiliaria en Corrientes: compra, venta y alquiler de casas, departamentos, campos y terrenos, tasaciones formales y administración de alquileres.",
    telephone: BUSINESS.telephone,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.addressLocality,
      addressRegion: BUSINESS.addressRegion,
      addressCountry: BUSINESS.addressCountry,
    },
    areaServed: { "@type": "AdministrativeArea", name: "Corrientes, Argentina" },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "17:00",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: BUSINESS.telephone,
      contactType: "customer service",
      availableLanguage: "es",
      areaServed: "AR",
    },
    knowsAbout: [
      "Compra y venta de propiedades",
      "Alquileres",
      "Administración de alquileres",
      "Tasaciones inmobiliarias",
      "Campos y terrenos",
    ],
    sameAs: [BUSINESS.instagram],
  };
}

// WebSite: es la pieza de la que Google toma el NOMBRE del sitio que
// muestra arriba de cada resultado (en vez del dominio pelado).
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    alternateName: ["García Propiedades", "inmogp.com"],
    url: SITE_URL,
    inLanguage: "es-AR",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

// Qué ES la propiedad, además del aviso. Casa y departamento son
// "Accommodation" (aceptan dormitorios, baños, superficie); un campo, un
// terreno o un local no, y se describen como lugar.
function accommodationType(propertyType: string): "House" | "Apartment" | "Place" {
  const t = propertyType.toLowerCase();
  if (t.includes("casa") || t.includes("duplex") || t.includes("dúplex")) return "House";
  if (t.includes("departamento") || t === "ph" || t.includes("monoambiente")) return "Apartment";
  return "Place";
}

function squareMeters(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? { "@type": "QuantitativeValue", value: n, unitCode: "MTK" } : undefined;
}

export function listingJsonLd(listing: ListingDetail) {
  const displayTitle = listing.contentTitle ?? listing.title;
  const url = absoluteUrl(listingPath(listing.code ?? String(listing.id)));
  const type = accommodationType(listing.propertyType);

  const address =
    listing.address || listing.city
      ? {
          "@type": "PostalAddress",
          streetAddress: listing.address ?? undefined,
          addressLocality: listing.city ?? undefined,
          addressRegion: listing.region ?? undefined,
          addressCountry: "AR",
        }
      : undefined;

  const geo =
    listing.latitude && listing.longitude
      ? { "@type": "GeoCoordinates", latitude: Number(listing.latitude), longitude: Number(listing.longitude) }
      : undefined;

  const isHome = type !== "Place";

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": `${url}#listing`,
    url,
    name: displayTitle,
    description: listing.description ?? undefined,
    image: listing.images.map((img) => img.url),
    datePosted: listing.sourceUpdatedAt ?? undefined,
    inLanguage: "es-AR",
    identifier: listing.code ? { "@type": "PropertyValue", name: "Código", value: listing.code } : undefined,
    about: {
      "@type": type,
      name: displayTitle,
      address,
      geo,
      floorSize: squareMeters(listing.floorArea ?? listing.plotArea ?? listing.landArea),
      ...(isHome
        ? {
            numberOfBedrooms: listing.rooms ?? undefined,
            numberOfBathroomsTotal: listing.bathrooms ?? undefined,
          }
        : {}),
    },
    offers:
      listing.priceAmount !== null
        ? {
            "@type": "Offer",
            url,
            price: String(listing.priceAmount),
            priceCurrency: listing.priceCurrency ?? "ARS",
            businessFunction:
              listing.operationType === "For Rent"
                ? "http://purl.org/goodrelations/v1#LeaseOut"
                : "http://purl.org/goodrelations/v1#Sell",
            availability: "https://schema.org/InStock",
            seller: { "@id": ORGANIZATION_ID },
          }
        : undefined,
    provider: { "@id": ORGANIZATION_ID },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

// Lista de propiedades de un listado (página de resultados): le dice a
// buscadores e IAs qué propiedades concretas hay detrás de "casas en
// venta en Corrientes", cada una con su URL.
export function listingItemListJsonLd(name: string, items: ListingCard[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items
      .filter((l) => l.code)
      .map((l, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(listingPath(l.code!)),
        name: `${l.contentTitle ?? l.title} — ${operationLabel(l.operationType)}${l.city ? ` en ${l.city}` : ""}`,
      })),
  };
}

// JSON.stringify no escapa "<": un texto de aviso con "</script>" podría
// cerrar la etiqueta antes de tiempo. Se reemplaza por su escape
// unicode, que es la recomendación de la guía de JSON-LD de Next.
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
