import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "crypto";
import { runSync } from "@/lib/sync";

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

export async function POST(request: NextRequest) {
  const secret = process.env.SYNC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "SYNC_SECRET no configurado en el servidor" }, { status: 500 });
  }

  const provided = request.headers.get("x-sync-secret");
  if (!provided || !secretsMatch(provided, secret)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await runSync({ force: request.nextUrl.searchParams.get("force") === "true" });

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
