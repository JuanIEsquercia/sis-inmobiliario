import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { createAdminClient } from "@/lib/supabase/admin";
import { procesarFoto } from "@/lib/property-image-processing";
import {
  MAX_FOTOS_POR_PROPIEDAD,
  PROPERTY_IMAGES_BUCKET,
  storageObjectName,
} from "@/lib/property-images";

// Copia las fotos de una propiedad desde Adinco a nuestro Storage
// (bucket público "propiedades"): las primeras MAX_FOTOS_POR_PROPIEDAD,
// con la destacada primero, procesadas por procesarFoto. Idempotente:
// las que ya tienen storagePath no se vuelven a copiar.

type AdminClient = ReturnType<typeof createAdminClient>;

export async function asegurarBucketPropiedades(admin: AdminClient = createAdminClient()): Promise<void> {
  const { data } = await admin.storage.getBucket(PROPERTY_IMAGES_BUCKET);
  if (data) return;
  // Público: las fotos se muestran en el sitio sin login, igual que hoy
  // las de Adinco. Solo imágenes WebP y con tope de tamaño por archivo.
  const { error } = await admin.storage.createBucket(PROPERTY_IMAGES_BUCKET, {
    public: true,
    allowedMimeTypes: ["image/webp"],
    fileSizeLimit: "2MB",
  });
  if (error) throw new Error(`No se pudo crear el bucket ${PROPERTY_IMAGES_BUCKET}: ${error.message}`);
}

// Ruta estable por foto: depende de la URL de origen, así volver a
// correr la copia (o un sync que recrea las filas) cae en el mismo
// archivo en vez de duplicarlo.
function rutaBase(listingId: number, urlOrigen: string): string {
  const hash = createHash("sha1").update(urlOrigen).digest("hex").slice(0, 16);
  return `listings/${listingId}/${hash}`;
}

export interface ResultadoCopia {
  copiadas: number;
  yaEstaban: number;
  recortadas: number;
  bytesSubidos: number;
  errores: { url: string; motivo: string }[];
}

export async function copiarFotosDeListing(listingId: number, admin: AdminClient = createAdminClient()): Promise<ResultadoCopia> {
  const resultado: ResultadoCopia = { copiadas: 0, yaEstaban: 0, recortadas: 0, bytesSubidos: 0, errores: [] };

  const fotos = await withRetry(() =>
    prisma.listingImage.findMany({
      where: { listingId },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      take: MAX_FOTOS_POR_PROPIEDAD,
      select: { id: true, url: true, storagePath: true },
    })
  );

  for (const foto of fotos) {
    if (foto.storagePath) {
      resultado.yaEstaban++;
      continue;
    }
    try {
      const res = await fetch(foto.url);
      if (!res.ok) throw new Error(`HTTP ${res.status} al bajar la foto`);
      const procesada = await procesarFoto(Buffer.from(await res.arrayBuffer()));

      const base = rutaBase(listingId, foto.url);
      for (const version of procesada.versiones) {
        const { error } = await admin.storage
          .from(PROPERTY_IMAGES_BUCKET)
          .upload(storageObjectName(base, version.ancho), version.buffer, {
            contentType: "image/webp",
            // El nombre depende de la foto de origen y no cambia: se puede
            // cachear un año en el navegador y en el CDN.
            cacheControl: "31536000",
            upsert: true,
          });
        if (error) throw new Error(`Storage: ${error.message}`);
        resultado.bytesSubidos += version.buffer.length;
      }

      // Recién con todas las versiones subidas se marca como copiada: si
      // algo falla a mitad de camino, la foto sigue mostrándose desde
      // Adinco y la próxima corrida la reintenta.
      await withRetry(() => prisma.listingImage.update({ where: { id: foto.id }, data: { storagePath: base } }));
      resultado.copiadas++;
      if (procesada.recortada) resultado.recortadas++;
    } catch (err) {
      resultado.errores.push({ url: foto.url, motivo: err instanceof Error ? err.message : String(err) });
    }
  }

  return resultado;
}
