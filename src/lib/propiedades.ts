import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { normalizeForSearch } from "@/lib/search-text";
import { codigoMaximo, normalizarCodigo } from "@/lib/property-codes";
import type { ListingOrigin, ListingStatus, Prisma } from "@/generated/prisma/client";

// Ficha de propiedad del backoffice (sección Propiedades). La tabla es
// Listing: la misma que lee el sitio público, más los datos internos
// (estado comercial, captador, notas) que nunca vienen de Adinco.

export const ESTADOS: { value: ListingStatus; label: string }[] = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "RESERVADA", label: "Reservada" },
  { value: "VENDIDA", label: "Vendida" },
  { value: "ALQUILADA", label: "Alquilada" },
  { value: "SUSPENDIDA", label: "Suspendida" },
];

export const ESTADO_LABEL: Record<ListingStatus, string> = Object.fromEntries(
  ESTADOS.map((e) => [e.value, e.label])
) as Record<ListingStatus, string>;

// Estados que sacan la ficha del sitio. RESERVADA no: sigue publicada
// con una etiqueta, para que se vea que hay movimiento.
export const ESTADOS_NO_PUBLICABLES: ListingStatus[] = ["VENDIDA", "ALQUILADA", "SUSPENDIDA"];

export const ORIGEN_LABEL: Record<ListingOrigin, string> = {
  ADINCO: "Adinco",
  PROPIA: "Propia",
};

// operationType guarda el valor del feed de Adinco ("For Sale"/"For
// Rent"), que es lo que ya entiende todo el sitio. Las fichas propias
// usan el mismo vocabulario.
export const OPERACIONES = [
  { value: "For Sale", label: "Venta" },
  { value: "For Rent", label: "Alquiler" },
];

export const MONEDAS = ["USD", "ARS"];

const PAGE_SIZE = 50;

export interface FiltrosPropiedades {
  q?: string;
  estado?: string;
  operacion?: string;
  origen?: string;
  publicada?: string; // "si" | "no"
  page?: number;
}

function whereDeFiltros(f: FiltrosPropiedades): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [];
  const q = f.q?.trim();
  if (q) {
    const codigo = normalizarCodigo(q);
    const or: Prisma.ListingWhereInput[] = [
      { addressSearch: { contains: normalizeForSearch(q) } },
      { contentTitle: { contains: q, mode: "insensitive" } },
      { title: { contains: q, mode: "insensitive" } },
    ];
    if (codigo && /^\s*\D*\d+\s*$/.test(q)) or.unshift({ code: codigo });
    and.push({ OR: or });
  }
  if (f.estado && ESTADOS.some((e) => e.value === f.estado)) and.push({ status: f.estado as ListingStatus });
  if (f.operacion && OPERACIONES.some((o) => o.value === f.operacion)) and.push({ operationType: f.operacion });
  if (f.origen === "ADINCO" || f.origen === "PROPIA") and.push({ origin: f.origen });
  if (f.publicada === "si") and.push({ isActive: true });
  if (f.publicada === "no") and.push({ isActive: false });
  return and.length > 0 ? { AND: and } : {};
}

export async function getPropiedades(filtros: FiltrosPropiedades) {
  const where = whereDeFiltros(filtros);
  const page = Math.max(1, filtros.page ?? 1);
  const [total, items] = await withRetry(() =>
    Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        // Lo último modificado arriba.
        orderBy: [{ updatedAt: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          code: true,
          title: true,
          contentTitle: true,
          address: true,
          city: true,
          operationType: true,
          propertyType: true,
          priceAmount: true,
          priceCurrency: true,
          priceRaw: true,
          hidePrice: true,
          status: true,
          origin: true,
          isActive: true,
          captadorAgent: { select: { username: true } },
          images: {
            orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
            take: 1,
            select: { url: true, storagePath: true },
          },
        },
      }),
    ])
  );
  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getPropiedadById(id: number) {
  const listing = await withRetry(() =>
    prisma.listing.findUnique({
      where: { id },
      include: {
        images: { orderBy: [{ sortOrder: "asc" }] },
        videos: { select: { url: true } },
        captadorAgent: { select: { id: true, username: true, firstName: true, lastName: true } },
        createdBy: { select: { username: true } },
      },
    })
  );
  if (!listing) return null;

  // Operaciones del Historial de esta propiedad: las vinculadas a la
  // ficha y las que tienen el mismo código normalizado (la vinculación
  // definitiva es la etapa de normalización; acá se muestran las dos).
  const codigo = normalizarCodigo(listing.code);
  const unidades = await withRetry(() =>
    prisma.unit.findMany({
      select: {
        id: true,
        propertyCode: true,
        address: true,
        listingId: true,
        _count: { select: { contracts: true, sales: true, appraisals: true } },
      },
    })
  );
  const historial = unidades.filter(
    (u) => u.listingId === listing.id || (codigo !== null && normalizarCodigo(u.propertyCode) === codigo)
  );

  // Sugerencia de captador: el "vendedor" que Adinco tiene asignado al
  // aviso, si su email coincide con el de un usuario del sistema. Es
  // solo una sugerencia para la carga inicial; no se guarda sola.
  let captadorSugerido: { id: string; username: string } | null = null;
  if (!listing.captadorAgentId && listing.sellerEmail) {
    captadorSugerido = await withRetry(() =>
      prisma.profile.findFirst({
        where: { email: { equals: listing.sellerEmail!, mode: "insensitive" }, isActive: true },
        select: { id: true, username: true },
      })
    );
  }

  return { listing, historial, captadorSugerido };
}

// Próximo código de propiedad propio: el último número usado + 1, sin
// saltos ni repetidos. Toma como piso el máximo entre las fichas y las
// unidades del Historial (normalizado: "GARC1-392" cuenta como 392), así
// nunca repite un código existente aunque Adinco siga numerando hasta el
// corte.
//
// Dos altas al mismo tiempo no pueden recibir el mismo número: el bloqueo
// (pg_advisory_xact_lock, se suelta solo al terminar la transacción) hace
// que las asignaciones vayan de a una. Sin él, una podía reajustar el
// contador hacia atrás después de que la otra ya usó el número. Tiene que
// llamarse dentro de la misma transacción que crea la ficha.
export async function siguienteCodigoPropio(tx: Prisma.TransactionClient): Promise<string> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('listing_code_seq'))`;
  const [fichas, unidades] = await Promise.all([
    tx.listing.findMany({ where: { code: { not: null } }, select: { code: true } }),
    tx.unit.findMany({ select: { propertyCode: true } }),
  ]);
  const piso = codigoMaximo([...fichas.map((f) => f.code), ...unidades.map((u) => u.propertyCode)]);
  await tx.$executeRaw`
    SELECT setval('listing_code_seq', GREATEST((SELECT last_value FROM listing_code_seq), ${piso}::bigint))
  `;
  const [{ codigo }] = await tx.$queryRaw<{ codigo: bigint }[]>`SELECT nextval('listing_code_seq') AS codigo`;
  return String(codigo);
}
