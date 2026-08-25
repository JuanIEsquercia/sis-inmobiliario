import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "contract-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadContractDocument(
  contractId: number,
  file: File
): Promise<{ storagePath: string }> {
  if (file.type !== "application/pdf") {
    throw new Error("Solo se aceptan archivos PDF");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("El archivo no puede superar los 10MB");
  }

  const storagePath = `contracts/${contractId}/${crypto.randomUUID()}-${file.name}`;

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
  });

  if (error) throw new Error(`No se pudo subir el archivo: ${error.message}`);

  return { storagePath };
}

export async function getSignedDocumentUrl(storagePath: string, expiresInSeconds = 300): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}
