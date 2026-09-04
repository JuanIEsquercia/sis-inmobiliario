import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cierra la sesión de Supabase del lado del servidor y manda al login.
// Existe porque requireProfile corre dentro de un Server Component, que
// no puede escribir cookies — cuando encuentra una sesión válida sin
// Profile detrás (o con el usuario desactivado) no puede cerrarla ahí
// mismo: redirige acá, que sí puede. Sin esto ese usuario quedaba en un
// loop login ↔ backoffice: el proxy veía la cookie viva y lo volvía a
// mandar adentro. El querystring (?motivo=...) se conserva para que el
// login pueda explicar qué pasó.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const url = request.nextUrl.clone();
  url.pathname = "/backoffice/login";
  return NextResponse.redirect(url);
}
