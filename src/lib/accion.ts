import { unstable_rethrow } from "next/navigation";

// Resultado que vuelve al navegador después de un server action del
// backoffice. Lo lee <ActionForm> para mostrar el aviso de "✓ listo" o
// el error, sin sacar al usuario de la pantalla.
export type ResultadoAccion = { ok: true } | { ok: false; error: string };

const ERROR_GENERICO = "No se pudo completar la operación. Intentá de nuevo en unos segundos.";

// Por qué existe esto:
//
// Las acciones avisan los problemas con `throw new Error("Falta X")`.
// Pero en producción Next NO manda el texto de un error lanzado en el
// servidor al navegador (para no filtrar detalles internos): lo cambia
// por un mensaje genérico con un código. O sea que el agente nunca veía
// "Agregá al menos una cuota", sino una pantalla de error genérica.
//
// conAviso envuelve la acción y convierte ese throw en un resultado
// común ({ ok: false, error }), que sí viaja al navegador tal cual.
//
// Qué texto se muestra:
//   - Error "a secas" (new Error(...)): son los mensajes escritos a mano
//     en las acciones y en form-utils, pensados para el usuario. Van
//     tal cual.
//   - Cualquier otro (errores de Prisma, de red, de Supabase): pueden
//     traer detalles internos, así que se muestra un mensaje genérico y
//     el detalle queda en los logs de Vercel.
//
// redirect() y notFound() también funcionan tirando una excepción:
// unstable_rethrow las deja pasar para que Next haga la navegación.
export function conAviso<A extends unknown[]>(
  accion: (...args: A) => Promise<unknown>
): (...args: A) => Promise<ResultadoAccion> {
  return async (...args: A) => {
    try {
      await accion(...args);
      return { ok: true };
    } catch (err) {
      unstable_rethrow(err);
      console.error(err);
      const esMensajePropio = err instanceof Error && err.constructor === Error && err.message;
      return { ok: false, error: esMensajePropio ? err.message : ERROR_GENERICO };
    }
  };
}
