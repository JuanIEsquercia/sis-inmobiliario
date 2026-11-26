import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { formatPrice, operationLabel } from "@/lib/format";
import { SITE_NAME, SITE_URL, BUSINESS, absoluteUrl } from "@/lib/seo";
import { listingPath } from "@/lib/structured-data";

// /llms.txt — resumen del sitio pensado para modelos de lenguaje
// (propuesta abierta llmstxt.org). Un buscador con IA que llega acá
// entiende en una sola lectura quiénes somos, cómo contactarnos y qué
// propiedades hay publicadas, cada una con su URL, sin tener que
// interpretar el HTML de cada página.
//
// Solo datos que ya son públicos en el sitio (nada de backoffice) y
// solo las propiedades activas. Se arma en cada pedido y la CDN lo
// guarda una hora: el catálogo cambia con el sync diario.
export const dynamic = "force-dynamic";

function linea(l: {
  code: string;
  title: string;
  contentTitle: string | null;
  operationType: string;
  propertyType: string;
  city: string | null;
  rooms: number | null;
  bathrooms: number | null;
  floorArea: unknown;
  plotArea: unknown;
  priceAmount: unknown;
  priceCurrency: string | null;
  priceRaw: string | null;
}): string {
  const nombre = `${l.propertyType} en ${operationLabel(l.operationType).toLowerCase()}${l.city ? ` en ${l.city}` : ""}`;
  const superficie = Number(l.floorArea ?? l.plotArea);
  const datos = [
    l.contentTitle ?? l.title,
    l.rooms ? `${l.rooms} dormitorios` : null,
    l.bathrooms ? `${l.bathrooms} baños` : null,
    Number.isFinite(superficie) && superficie > 0 ? `${superficie} m²` : null,
    formatPrice(l),
    `Código ${l.code}`,
  ].filter(Boolean);
  return `- [${nombre}](${absoluteUrl(listingPath(l.code))}): ${datos.join(". ")}.`;
}

export async function GET() {
  const listings = await withRetry(() =>
    prisma.listing.findMany({
      where: { isActive: true, code: { not: null } },
      select: {
        code: true,
        title: true,
        contentTitle: true,
        operationType: true,
        propertyType: true,
        city: true,
        rooms: true,
        bathrooms: true,
        floorArea: true,
        plotArea: true,
        priceAmount: true,
        priceCurrency: true,
        priceRaw: true,
      },
      orderBy: { sourceUpdatedAt: "desc" },
    })
  );

  const conCodigo = listings.filter((l): l is typeof l & { code: string } => !!l.code);
  const venta = conCodigo.filter((l) => l.operationType !== "For Rent");
  const alquiler = conCodigo.filter((l) => l.operationType === "For Rent");

  const texto = [
    `# ${SITE_NAME}`,
    "",
    `> Inmobiliaria en Corrientes, Argentina. Compra, venta y alquiler de casas, departamentos, campos y terrenos; tasaciones formales con informe e imágenes; administración de alquileres.`,
    "",
    "## Contacto",
    "",
    `- Dirección: ${BUSINESS.streetAddress}, ${BUSINESS.addressLocality}, ${BUSINESS.addressRegion}, Argentina (con cochera para clientes)`,
    `- Teléfono y WhatsApp: ${BUSINESS.telephone}`,
    "- Horario: lunes a viernes de 9 a 17, de corrido",
    `- Instagram: ${BUSINESS.instagram}`,
    `- Sitio: ${SITE_URL}`,
    "",
    "## Páginas principales",
    "",
    `- [Inicio](${absoluteUrl("/")}): servicios, preguntas frecuentes y calculadora de actualización de alquileres`,
    `- [Todas las propiedades](${absoluteUrl("/propiedades")}): catálogo completo con filtros por operación, tipo, ciudad, precio y dormitorios`,
    `- [Propiedades en venta](${absoluteUrl("/propiedades?operacion=For+Sale")})`,
    `- [Propiedades en alquiler](${absoluteUrl("/propiedades?operacion=For+Rent")})`,
    `- [Nuestro equipo](${absoluteUrl("/equipo")}): agentes con contacto directo por WhatsApp`,
    "",
    "## Para consultar por una propiedad",
    "",
    "Cada propiedad tiene un código. Para consultar, escribir por WhatsApp indicando el código; la ficha de cada propiedad tiene un botón que arma ese mensaje.",
    "",
    `## Propiedades en venta (${venta.length})`,
    "",
    ...(venta.length ? venta.map(linea) : ["- Sin propiedades en venta publicadas en este momento."]),
    "",
    `## Propiedades en alquiler (${alquiler.length})`,
    "",
    ...(alquiler.length ? alquiler.map(linea) : ["- Sin propiedades en alquiler publicadas en este momento."]),
    "",
  ].join("\n");

  return new Response(texto, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
