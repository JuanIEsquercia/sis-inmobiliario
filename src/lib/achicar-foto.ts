// Achica una foto en el navegador antes de subirla. Las de celular pesan
// 4-8 MB y el envío a una server action tiene tope de 4 MB (ver
// next.config.ts). 2400 px de lado mayor sobra para la versión más grande
// que se guarda (1600) y deja margen para el recorte de bordes.
//
// Solo navegador (usa canvas). Lo usan el alta de propiedad y la sección
// de fotos de la ficha.

const LADO_MAXIMO_SUBIDA = 2400;

export async function achicarFoto(file: File): Promise<File> {
  const imagen = await createImageBitmap(file, { imageOrientation: "from-image" });
  const escala = Math.min(1, LADO_MAXIMO_SUBIDA / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagen.width * escala);
  canvas.height = Math.round(imagen.height * escala);
  canvas.getContext("2d")!.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  imagen.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la foto"))), "image/jpeg", 0.9)
  );
  return new File([blob], "foto.jpg", { type: "image/jpeg" });
}
