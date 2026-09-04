import { createAdminClient } from "@/lib/supabase/admin";

// Un solo bucket privado para todos los PDF del backoffice — la carpeta
// (prefijo del path) es lo que separa contratos de tasaciones, no el
// bucket.
const BUCKET = "contract-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Nombre seguro para usarlo como parte de la key del bucket — se sacan
// separadores de path y caracteres raros y se acota el largo. El nombre
// original se guarda aparte en la fila (fileName) para mostrarlo.
function safeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.\-]+/g, "_").replace(/^\.+/, "");
  return (cleaned || "archivo").slice(0, 100);
}

// El MIME que manda el navegador es lo que declare el cliente, no lo que
// es el archivo — además se verifica la firma real: un PDF de verdad
// siempre arranca con "%PDF-".
async function assertIsPdf(file: File): Promise<void> {
  if (file.type !== "application/pdf") {
    throw new Error("Solo se aceptan archivos PDF");
  }
  const head = Buffer.from(await file.slice(0, 5).arrayBuffer()).toString("latin1");
  if (head !== "%PDF-") {
    throw new Error("El archivo no es un PDF válido");
  }
}

async function uploadPdf(pathPrefix: string, file: File): Promise<{ storagePath: string }> {
  await assertIsPdf(file);
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("El archivo no puede superar los 10MB");
  }

  const storagePath = `${pathPrefix}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
  });

  if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`);

  return { storagePath };
}

export async function uploadContractDocument(
  contractId: number,
  file: File
): Promise<{ storagePath: string }> {
  return uploadPdf(`contracts/${contractId}`, file);
}

export async function uploadAppraisalReport(appraisalId: number, file: File): Promise<{ storagePath: string }> {
  return uploadPdf(`appraisals/${appraisalId}`, file);
}

export async function getSignedDocumentUrl(storagePath: string, expiresInSeconds = 300): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

// Para eliminarContratoDefinitivo — borrar las filas de ContractDocument
// no borra los archivos reales del bucket, hay que sacarlos aparte. No
// tira si algún path ya no existe (mismo criterio tolerante que
// deletePublicImage).
export async function deleteContractDocuments(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return;
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove(storagePaths);
}

// Buckets PÚBLICOS aparte del de documentos — son imágenes de marketing
// (logos de marcas, fotos de personal para el sitio), no hace falta URL
// firmada ni ocultarlas: al contrario, tienen que poder cachearse en el
// navegador como cualquier <img> normal.
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

async function ensurePublicBucketExists(admin: ReturnType<typeof createAdminClient>, bucket: string) {
  const { data: existing } = await admin.storage.getBucket(bucket);
  if (existing) return;
  const { error } = await admin.storage.createBucket(bucket, { public: true });
  // Puede fallar por una carrera si dos subidas llegan al mismo tiempo y
  // ambas ven "no existe" — no es un problema real, el bucket ya está.
  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(`No se pudo preparar el almacenamiento de imágenes: ${error.message}`);
  }
}

async function uploadPublicImage(
  bucket: string,
  maxSize: number,
  file: File
): Promise<{ storagePath: string; imageUrl: string }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Solo se aceptan imágenes PNG, JPG, WEBP o SVG");
  }
  if (file.size > maxSize) {
    throw new Error(`El archivo no puede superar los ${Math.round(maxSize / (1024 * 1024))}MB`);
  }

  const admin = createAdminClient();
  await ensurePublicBucketExists(admin, bucket);

  const storagePath = `${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await admin.storage.from(bucket).upload(storagePath, file, {
    contentType: file.type,
  });
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`);

  const { data } = admin.storage.from(bucket).getPublicUrl(storagePath);
  return { storagePath, imageUrl: data.publicUrl };
}

async function deletePublicImage(bucket: string, storagePath: string): Promise<void> {
  const admin = createAdminClient();
  await admin.storage.from(bucket).remove([storagePath]);
}

const LOGOS_BUCKET = "partner-logos";
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB — son logos, no fotos de propiedades

export async function uploadPartnerLogo(file: File) {
  return uploadPublicImage(LOGOS_BUCKET, MAX_LOGO_SIZE, file);
}

export async function deletePartnerLogo(storagePath: string) {
  return deletePublicImage(LOGOS_BUCKET, storagePath);
}

const STAFF_PHOTOS_BUCKET = "staff-photos";
const MAX_STAFF_PHOTO_SIZE = 4 * 1024 * 1024; // 4MB

export async function uploadStaffPhoto(file: File) {
  return uploadPublicImage(STAFF_PHOTOS_BUCKET, MAX_STAFF_PHOTO_SIZE, file);
}

export async function deleteStaffPhoto(storagePath: string) {
  return deletePublicImage(STAFF_PHOTOS_BUCKET, storagePath);
}
