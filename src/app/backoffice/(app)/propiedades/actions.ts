"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { conAviso } from "@/lib/accion";
import { optionalDecimal, optionalInt, optionalStr, requiredStr } from "@/lib/form-utils";
import { normalizeForSearch } from "@/lib/search-text";
import { PROPERTY_TYPES } from "@/lib/property-types";
import { ESTADOS, ESTADOS_NO_PUBLICABLES, MONEDAS, OPERACIONES, siguienteCodigoPropio } from "@/lib/propiedades";
import { createAdminClient } from "@/lib/supabase/admin";
import { procesarFoto } from "@/lib/property-image-processing";
import { asegurarBucketPropiedades } from "@/lib/property-image-copy";
import {
  MAX_FOTOS_POR_PROPIEDAD,
  PROPERTY_IMAGES_BUCKET,
  PROPERTY_IMAGE_WIDTHS,
  storageObjectName,
} from "@/lib/property-images";
import type { ListingStatus } from "@/generated/prisma/client";

// Acciones de la sección Propiedades. Regla hasta el corte con Adinco:
// en una ficha de origen ADINCO solo se editan los datos internos
// (estado, captador, notas); lo publicado (precio, descripción, fotos,
// publicar o no) se sigue manejando en Adinco, porque el próximo sync lo
// pisaría. Las fichas PROPIA se editan completas.

function revalidarFicha(id: number) {
  revalidatePath("/backoffice/propiedades");
  revalidatePath(`/backoffice/propiedades/${id}`);
  // El sitio público lee la misma tabla.
  revalidatePath("/", "layout");
}

async function fichaPropia(id: number) {
  const listing = await withRetry(() =>
    prisma.listing.findUnique({ where: { id }, select: { id: true, origin: true, status: true, isActive: true } })
  );
  if (!listing) throw new Error("La propiedad ya no existe.");
  if (listing.origin !== "PROPIA") {
    throw new Error("Esta ficha viene de Adinco: sus datos publicados se editan en Adinco hasta el corte.");
  }
  return listing;
}

function estadoDe(formData: FormData): ListingStatus {
  const v = String(formData.get("status") ?? "");
  const estado = ESTADOS.find((e) => e.value === v);
  if (!estado) throw new Error("Elegí un estado válido.");
  return estado.value;
}

// --- Datos internos (cualquier origen) ---------------------------------

export const actualizarDatosInternos = conAviso(async function actualizarDatosInternos(id: number, formData: FormData) {
  await requirePermission("propiedades.editar");
  const actual = await withRetry(() => prisma.listing.findUnique({ where: { id }, select: { status: true } }));
  if (!actual) throw new Error("La propiedad ya no existe.");

  const status = estadoDe(formData);
  const cambiaEstado = status !== actual.status;

  await withRetry(() =>
    prisma.listing.update({
      where: { id },
      data: {
        status,
        statusChangedAt: cambiaEstado ? new Date() : undefined,
        captadorAgentId: optionalStr(formData.get("captadorAgentId")),
        internalNotes: optionalStr(formData.get("internalNotes")),
        // Vendida, alquilada o suspendida sale del sitio en el acto. Volver
        // a disponible no la publica sola: en las propias se publica a
        // mano, y en las de Adinco vuelve con el próximo sync si sigue
        // vigente allá.
        ...(ESTADOS_NO_PUBLICABLES.includes(status) ? { isActive: false } : {}),
      },
    })
  );
  revalidarFicha(id);
});

// --- Datos publicados (solo fichas propias) ----------------------------

function datosPublicados(formData: FormData) {
  const operationType = requiredStr(formData.get("operationType"), "Operación");
  if (!OPERACIONES.some((o) => o.value === operationType)) throw new Error("Elegí si es venta o alquiler.");
  const propertyType = requiredStr(formData.get("propertyType"), "Tipo de propiedad");
  if (!(PROPERTY_TYPES as readonly string[]).includes(propertyType)) throw new Error("Elegí un tipo de propiedad de la lista.");

  const titulo = requiredStr(formData.get("contentTitle"), "Título");
  const consultar = formData.get("consultarPrecio") === "on";
  const priceAmount = consultar ? null : optionalDecimal(formData.get("priceAmount"));
  const priceCurrency = consultar ? null : optionalStr(formData.get("priceCurrency"));
  if (!consultar && (!priceAmount || !priceCurrency)) {
    throw new Error('Cargá precio y moneda, o marcá "Consultar precio".');
  }
  if (priceCurrency && !MONEDAS.includes(priceCurrency)) throw new Error("Moneda inválida.");

  const addressName = optionalStr(formData.get("addressName"));
  const addressNumber = optionalStr(formData.get("addressNumber"));
  const address = [addressName, addressNumber].filter(Boolean).join(" ") || null;
  const aptoCredito = optionalStr(formData.get("aptoCredito"));

  return {
    // `title` es el título armado que usa Adinco; en las propias es el
    // mismo título que se escribe a mano.
    title: titulo,
    contentTitle: titulo,
    description: optionalStr(formData.get("description")),
    operationType,
    propertyType,
    priceAmount,
    priceCurrency,
    priceRaw: consultar ? "Consultar precio" : null,
    expenses: optionalDecimal(formData.get("expenses")),
    address,
    addressSearch: address ? normalizeForSearch(address) : null,
    addressName,
    addressNumber,
    addressFloor: optionalStr(formData.get("addressFloor")),
    addressApartment: optionalStr(formData.get("addressApartment")),
    neighborhood: optionalStr(formData.get("neighborhood")),
    city: optionalStr(formData.get("city")),
    region: optionalStr(formData.get("region")),
    country: "Argentina",
    latitude: optionalDecimal(formData.get("latitude")),
    longitude: optionalDecimal(formData.get("longitude")),
    floorArea: optionalDecimal(formData.get("floorArea")),
    plotArea: optionalDecimal(formData.get("plotArea")),
    rooms: optionalInt(formData.get("rooms")),
    bathrooms: optionalInt(formData.get("bathrooms")),
    coveredGarages: optionalInt(formData.get("coveredGarages")),
    year: optionalInt(formData.get("year")),
    aptoCredito: aptoCredito === "si" ? true : aptoCredito === "no" ? false : null,
  };
}

export const crearPropiedad = conAviso(async function crearPropiedad(formData: FormData) {
  const profile = await requirePermission("propiedades.editar");
  const datos = datosPublicados(formData);
  const captadorAgentId = optionalStr(formData.get("captadorAgentId"));

  const creada = await withRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const code = await siguienteCodigoPropio(tx);
        return tx.listing.create({
          data: {
            ...datos,
            code,
            // externalId es la clave del sync con Adinco; una ficha propia
            // nunca viene en el XML, pero la columna es obligatoria y única.
            externalId: `propia-${code}`,
            origin: "PROPIA",
            status: "DISPONIBLE",
            // Nace sin publicar: se publica cuando tiene fotos y datos
            // revisados (acción publicarPropiedad).
            isActive: false,
            captadorAgentId,
            internalNotes: optionalStr(formData.get("internalNotes")),
            createdById: profile.id,
            sourceUpdatedAt: new Date(),
            rawData: {},
          },
          select: { id: true },
        });
      },
      { timeout: 20000, maxWait: 10000 }
    )
  );
  revalidatePath("/backoffice/propiedades");
  redirect(`/backoffice/propiedades/${creada.id}`);
});

export const actualizarPublicacion = conAviso(async function actualizarPublicacion(id: number, formData: FormData) {
  await requirePermission("propiedades.editar");
  await fichaPropia(id);
  const datos = datosPublicados(formData);
  await withRetry(() => prisma.listing.update({ where: { id }, data: { ...datos, sourceUpdatedAt: new Date() } }));
  revalidarFicha(id);
});

export const publicarPropiedad = conAviso(async function publicarPropiedad(id: number, publicar: boolean) {
  await requirePermission("propiedades.publicar");
  const listing = await fichaPropia(id);
  if (publicar && ESTADOS_NO_PUBLICABLES.includes(listing.status)) {
    throw new Error("Una propiedad vendida, alquilada o suspendida no se puede publicar. Cambiá primero el estado.");
  }
  await withRetry(() => prisma.listing.update({ where: { id }, data: { isActive: publicar } }));
  revalidarFicha(id);
});

// Pasa una ficha de Adinco a propia: desde ahí el sync deja de
// actualizarla y se edita completa desde acá. Es el paso del corte; antes
// de eso sirve para probar. Las fotos que todavía no se copiaron a
// nuestro Storage dejarían de verse el día que Adinco se dé de baja, así
// que se exige que tenga al menos una copiada.
export const convertirAPropia = conAviso(async function convertirAPropia(id: number) {
  await requirePermission("propiedades.editar");
  await requirePermission("propiedades.publicar");
  const listing = await withRetry(() =>
    prisma.listing.findUnique({
      where: { id },
      select: { origin: true, _count: { select: { images: { where: { storagePath: { not: null } } } } } },
    })
  );
  if (!listing) throw new Error("La propiedad ya no existe.");
  if (listing.origin === "PROPIA") return;
  if (listing._count.images === 0) {
    throw new Error("Primero hay que copiar sus fotos a nuestro Storage; si no, quedaría sin fotos al dar de baja Adinco.");
  }
  await withRetry(() =>
    prisma.$transaction([
      // Las fotos que no entraron en el tope de copias apuntan a Adinco:
      // en una ficha propia se borran para no depender de su CDN.
      prisma.listingImage.deleteMany({ where: { listingId: id, storagePath: null } }),
      prisma.listing.update({ where: { id }, data: { origin: "PROPIA" } }),
    ])
  );
  revalidarFicha(id);
});

// --- Fotos (solo fichas propias) ---------------------------------------

const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];

export const subirFoto = conAviso(async function subirFoto(id: number, formData: FormData) {
  await requirePermission("propiedades.editar");
  await fichaPropia(id);

  const archivo = formData.get("foto");
  if (!(archivo instanceof File) || archivo.size === 0) throw new Error("Elegí una foto.");
  if (!TIPOS_FOTO.includes(archivo.type)) throw new Error("La foto tiene que ser JPG, PNG o WebP.");

  const cantidad = await withRetry(() => prisma.listingImage.count({ where: { listingId: id } }));
  if (cantidad >= MAX_FOTOS_POR_PROPIEDAD) {
    throw new Error(`Cada propiedad lleva hasta ${MAX_FOTOS_POR_PROPIEDAD} fotos. Eliminá una para subir otra.`);
  }

  let procesada;
  try {
    procesada = await procesarFoto(Buffer.from(await archivo.arrayBuffer()));
  } catch {
    throw new Error("No se pudo leer la imagen. Probá con otra foto.");
  }

  const base = `listings/${id}/${crypto.randomUUID().slice(0, 16)}`;
  const admin = createAdminClient();
  await asegurarBucketPropiedades(admin);
  for (const v of procesada.versiones) {
    const { error } = await admin.storage.from(PROPERTY_IMAGES_BUCKET).upload(storageObjectName(base, v.ancho), v.buffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw new Error(`No se pudo guardar la foto: ${error.message}`);
  }

  const urlPrincipal = admin.storage
    .from(PROPERTY_IMAGES_BUCKET)
    .getPublicUrl(storageObjectName(base, PROPERTY_IMAGE_WIDTHS.principal)).data.publicUrl;

  await withRetry(() =>
    prisma.listingImage.create({
      data: { listingId: id, url: urlPrincipal, storagePath: base, sortOrder: cantidad, isFeatured: cantidad === 0 },
    })
  );
  revalidarFicha(id);
});

async function borrarArchivos(storagePath: string | null) {
  if (!storagePath) return;
  const nombres = [...new Set(Object.values(PROPERTY_IMAGE_WIDTHS))].map((w) => storageObjectName(storagePath, w));
  // Si falla, queda un archivo huérfano en el bucket: no rompe nada y no
  // vale la pena frenar el borrado de la foto por eso.
  await createAdminClient().storage.from(PROPERTY_IMAGES_BUCKET).remove(nombres).catch(() => undefined);
}

// Reordena 0..n-1 y deja como destacada la primera.
async function renumerar(listingId: number, idsEnOrden: number[]) {
  await withRetry(() =>
    prisma.$transaction(
      idsEnOrden.map((imageId, i) =>
        prisma.listingImage.update({ where: { id: imageId }, data: { sortOrder: i, isFeatured: i === 0 } })
      )
    )
  );
  revalidarFicha(listingId);
}

async function fotosEnOrden(listingId: number) {
  return withRetry(() =>
    prisma.listingImage.findMany({
      where: { listingId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, storagePath: true },
    })
  );
}

export const eliminarFoto = conAviso(async function eliminarFoto(id: number, imageId: number) {
  await requirePermission("propiedades.editar");
  await fichaPropia(id);
  const fotos = await fotosEnOrden(id);
  const foto = fotos.find((f) => f.id === imageId);
  if (!foto) throw new Error("La foto ya no existe.");
  await withRetry(() => prisma.listingImage.delete({ where: { id: imageId } }));
  await borrarArchivos(foto.storagePath);
  await renumerar(id, fotos.filter((f) => f.id !== imageId).map((f) => f.id));
});

export const moverFoto = conAviso(async function moverFoto(id: number, imageId: number, direccion: "antes" | "despues") {
  await requirePermission("propiedades.editar");
  await fichaPropia(id);
  const ids = (await fotosEnOrden(id)).map((f) => f.id);
  const i = ids.indexOf(imageId);
  const j = direccion === "antes" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await renumerar(id, ids);
});
