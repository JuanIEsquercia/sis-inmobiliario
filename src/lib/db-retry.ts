// La conexión a la región de Supabase tiene cortes intermitentes bajo uso
// sostenido; reintentar con backoff evita que un visitante vea un 500 por
// un blip de red pasajero. Usado tanto por las lecturas del sitio
// (listings.ts) como por el pipeline de sync (sync.ts).
export async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, attempt * 500));
    }
  }
  throw lastErr;
}
