import { adincoImage, type AdincoVariant } from "@/lib/adinco-images";

// Fotos de propiedades: copia propia en Supabase Storage o, mientras no
// exista, el CDN de Adinco. Este módulo es el único que decide qué URL
// usar en cada lugar del sitio; los componentes no arman URLs a mano.
//
// La copia propia se guarda en WebP (medido sobre fotos reales del feed:
// pesa menos de la mitad que los JPEG de Adinco a igual uso) y con los
// bordes blancos recortados (ver property-image-processing.ts).

export const PROPERTY_IMAGES_BUCKET = "propiedades";

// Máximo de fotos por propiedad que se copian a nuestro Storage. Las demás
// quedan solo en el respaldo local de originales.
export const MAX_FOTOS_POR_PROPIEDAD = 8;

// Dónde se usa cada foto. Cada uso tiene un tamaño propio en la copia
// (en píxeles del lado mayor, que en las placas verticales de Adinco es
// el alto) y su equivalente entre los tamaños que sirve Adinco.
export type ImageUse = "principal" | "secundaria" | "tarjeta" | "miniatura";

export const PROPERTY_IMAGE_WIDTHS: Record<ImageUse, number> = {
  principal: 1600, // foto principal de la ficha y pantalla completa
  // Fotos chicas del mosaico de la ficha: se ven en recuadros del tamaño
  // de una tarjeta, así que comparten la versión de 640 (una menos que
  // guardar y servir por foto).
  secundaria: 640,
  tarjeta: 640, // tarjetas del listado
  miniatura: 320, // tira de miniaturas
};

const ADINCO_VARIANT: Record<ImageUse, AdincoVariant> = {
  principal: "extra_large",
  secundaria: "large",
  tarjeta: "medium",
  miniatura: "small",
};

export interface PropertyImageRef {
  url: string;
  storagePath?: string | null;
}

export function storageObjectName(storagePath: string, width: number): string {
  return `${storagePath}-${width}.webp`;
}

export function propertyImageSrc(img: PropertyImageRef, use: ImageUse): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (img.storagePath && base) {
    const name = storageObjectName(img.storagePath, PROPERTY_IMAGE_WIDTHS[use]);
    return `${base}/storage/v1/object/public/${PROPERTY_IMAGES_BUCKET}/${name}`;
  }
  return adincoImage(img.url, ADINCO_VARIANT[use]);
}

// Qué fotos se muestran: si la propiedad ya tiene copia propia, solo
// esas (como máximo MAX_FOTOS_POR_PROPIEDAD); si no, todas las de Adinco
// como hasta ahora. Así no se mezclan fotos propias con links de Adinco
// que el día del corte dejarían de funcionar.
export function visiblePropertyImages<T extends PropertyImageRef>(images: T[]): T[] {
  const propias = images.filter((img) => img.storagePath);
  return propias.length > 0 ? propias : images;
}
