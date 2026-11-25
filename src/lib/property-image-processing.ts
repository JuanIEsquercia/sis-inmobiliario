import sharp from "sharp";
import { PROPERTY_IMAGE_WIDTHS } from "@/lib/property-images";

// Convierte una foto (la original de Adinco o una subida a mano) en las
// versiones WebP que guarda nuestro Storage. Solo servidor y scripts
// (usa sharp, que es nativo): nunca importarlo desde un componente cliente.

const CALIDAD_WEBP = 75;

// Adinco entrega todo en 1920x1080: las fotos verticales vienen con
// bandas blancas a los costados (y alguna apaisada, arriba y abajo). Se
// recortan para que la foto llene el recuadro de las tarjetas y pese menos.
//
// Recorte conservador: solo se acepta si las bandas estaban en UN solo
// eje (el otro lado queda casi entero) y lo que queda conserva al menos
// un cuarto de ese lado. Así una foto con una pared blanca contra el
// borde no se mutila: para que sharp la recorte tendría que ser blanca
// de punta a punta, y además en un solo eje.
const UMBRAL_BLANCO = 20;
const LADO_ENTERO = 0.97;
const MINIMO_RESTANTE = 0.25;

export async function recortarBordesBlancos(input: Buffer): Promise<{ buffer: Buffer; recortada: boolean }> {
  const meta = await sharp(input).metadata();
  if (!meta.width || !meta.height) return { buffer: input, recortada: false };

  let recorte: { data: Buffer; info: { width: number; height: number } };
  try {
    recorte = await sharp(input)
      .trim({ background: "#ffffff", threshold: UMBRAL_BLANCO })
      .toBuffer({ resolveWithObject: true });
  } catch {
    // sharp falla si la imagen es toda del color de fondo: se deja igual.
    return { buffer: input, recortada: false };
  }

  const { width, height } = recorte.info;
  const anchoEntero = width >= meta.width * LADO_ENTERO;
  const altoEntero = height >= meta.height * LADO_ENTERO;
  if (anchoEntero && altoEntero) return { buffer: input, recortada: false }; // no había bandas
  const unSoloEje = anchoEntero !== altoEntero;
  const suficiente = width >= meta.width * MINIMO_RESTANTE && height >= meta.height * MINIMO_RESTANTE;
  if (!unSoloEje || !suficiente) return { buffer: input, recortada: false };

  return { buffer: recorte.data, recortada: true };
}

export interface FotoProcesada {
  recortada: boolean;
  versiones: { ancho: number; buffer: Buffer }[];
}

export async function procesarFoto(original: Buffer): Promise<FotoProcesada> {
  const { buffer, recortada } = await recortarBordesBlancos(original);
  const anchos = [...new Set(Object.values(PROPERTY_IMAGE_WIDTHS))];
  const versiones = await Promise.all(
    anchos.map(async (ancho) => ({
      ancho,
      buffer: await sharp(buffer)
        .rotate() // respeta la orientación EXIF de fotos sacadas con el celular
        // Se limita el lado MAYOR, no el ancho: casi todas las fotos de
        // Adinco son placas verticales 4:5, y limitando solo el ancho
        // quedaban altísimas y casi el doble de pesadas sin verse mejor.
        .resize({ width: ancho, height: ancho, fit: "inside", withoutEnlargement: true })
        .webp({ quality: CALIDAD_WEBP })
        .toBuffer(),
    }))
  );
  return { recortada, versiones };
}
