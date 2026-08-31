import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runSync } from "@/lib/sync";

export async function POST(request: NextRequest) {
  const secret = process.env.SYNC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "SYNC_SECRET no configurado en el servidor" }, { status: 500 });
  }

  const provided = request.headers.get("x-sync-secret");
  if (provided !== secret) {
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
