import { createAdminClient } from "@/lib/supabase/admin";

// Un solo bucket privado para todos los PDF del backoffice — la carpeta
// (prefijo del path) es lo que separa contratos de tasaciones, no el
// bucket.
const BUCKET = "contract-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function uploadPdf(pathPrefix: string, file: File): Promise<{ storagePath: string }> {
  if (file.type !== "application/pdf") {
    throw new Error("Solo se aceptan archivos PDF");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("El archivo no puede superar los 10MB");
  }

  const storagePath = `${pathPrefix}/${crypto.randomUUID()}-${file.name}`;

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
