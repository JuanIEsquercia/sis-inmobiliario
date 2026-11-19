// La conexión a la región de Supabase tiene cortes intermitentes bajo uso
// sostenido; reintentar con backoff evita que un visitante vea un 500 por
// un blip de red pasajero. Usado tanto por las lecturas del sitio
// (listings.ts) como por el pipeline de sync (sync.ts).
//
// Lo que NO se reintenta: los errores "a secas" (new Error("...")) que
// tiran las propias acciones adentro de una transacción para avisar algo
// ("Este pedido ya lo tomó X", "Ya se confirmó el cobro"). Son reglas
// del negocio, no cortes de red: van a fallar igual en cada intento, y
// reintentarlos solo demoraba 1,5 s el aviso al usuario.
export async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (esReglaDeNegocio(err)) throw err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, attempt * 500));
    }
  }
  throw lastErr;
}

function esReglaDeNegocio(err: unknown): boolean {
  return err instanceof Error && err.constructor === Error;
}
