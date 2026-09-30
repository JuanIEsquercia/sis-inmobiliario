import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "crypto";
import { runSync } from "@/lib/sync";

// El sync completo de los ~150 avisos tardó 26,5 s la vez que hubo que
// recuperar 23 días de atraso (137 avisos cambiados). El día a día es
// mucho menos, pero se declara un techo holgado: si la función se
// cortara por tiempo a mitad del recorrido, quedarían avisos
// actualizados y la baja de los que ya no están (que corre al final) sin
// hacer. No es grave — runSync es idempotente y la corrida siguiente lo
// retoma, porque SyncState recién se guarda al terminar — pero el sitio
// quedaría un día mostrando propiedades que ya no existen, que es
// justamente lo que esto viene a evitar.
export const maxDuration = 300;

// Comparación en tiempo constante — con `!==` común, el tiempo de
// respuesta varía según cuántos caracteres iniciales coinciden con el
// secreto real, lo que en teoría permite reconstruirlo byte a byte
// probando muchas veces. timingSafeEqual siempre tarda lo mismo sin
// importar en qué posición difieren.
function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Los buffers deben tener el mismo largo para timingSafeEqual — si no
  // coincide, ya sabemos que no matchea (comparar el largo no filtra
  // nada útil sobre el contenido del secreto).
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function ejecutar(force: boolean) {
  try {
    const result = await runSync({ force });

    // La portada (getFeaturedListings) no lee cookies/headers/searchParams,
    // así que Next la trata como estática — sin esto, un sync real no se
    // vería ahí hasta el próximo revalidate incidental o redeploy.
    // /propiedades no lo necesita (ya es dinámica por leer searchParams).
    if (!result.skippedUnchanged) {
      revalidatePath("/");
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

// GET = el cron diario de Vercel (ver vercel.json). Vercel invoca los
// cron SIEMPRE por GET, así que no alcanzaba con el POST de abajo.
//
// El horario en vercel.json es "0 21 * * *" y eso NO es un error: los
// cron de Vercel se interpretan siempre en UTC, sin excepción, y
// Argentina es UTC-3 todo el año (no hay horario de verano desde 2009).
// 21:00 UTC = 18:00 de Argentina, que es lo que se pidió. Como el
// archivo es JSON y no admite comentarios, queda anotado acá: si alguna
// vez hay que mover la hora, se corre este número, no el de Argentina.
//
// Se autentica distinto a propósito: Vercel manda el valor de la
// variable CRON_SECRET del proyecto en el header Authorization, con el
// prefijo "Bearer". Es el mecanismo que documenta Vercel, y sin esto la
// URL quedaría abierta para que cualquiera dispare el sync.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado en el servidor" }, { status: 500 });
  }

  const provided = request.headers.get("authorization");
  if (!provided || !secretsMatch(provided, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // El cron nunca fuerza: si el feed no cambió desde la última corrida
  // (mismo etag y last-modified), runSync corta enseguida sin tocar la
  // base. Forzar todos los días reescribiría los ~150 avisos enteros
  // (con sus fotos y videos) sin ninguna necesidad.
  return ejecutar(false);
}

// POST con secreto propio = disparo manual desde afuera (por ejemplo
// desde la terminal). Se mantiene separado del cron para poder revocar
// uno sin tocar el otro. El botón del backoffice NO pasa por acá: llama
// a runSync directo desde una server action, así queda sujeto a los
// permisos del usuario y no necesita ningún secreto.
export async function POST(request: NextRequest) {
  const secret = process.env.SYNC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "SYNC_SECRET no configurado en el servidor" }, { status: 500 });
  }

  const provided = request.headers.get("x-sync-secret");
  if (!provided || !secretsMatch(provided, secret)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return ejecutar(request.nextUrl.searchParams.get("force") === "true");
}
