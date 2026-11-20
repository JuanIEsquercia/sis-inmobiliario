import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // getClaims y no getUser: getUser le pregunta a Supabase Auth por la
  // red en CADA pedido del backoffice (cada clic, cada guardado), y
  // después la página vuelve a validar la sesión (ver lib/auth.ts).
  // getClaims verifica la firma del token acá mismo, sin viaje, cuando
  // el proyecto usa claves de firma asimétricas (JWT Signing Keys); con
  // la clave simétrica vieja hace la misma consulta que getUser, así que
  // en el peor caso queda igual que antes. Si el token está por vencer,
  // lo renueva primero y las cookies nuevas salen por setAll de arriba.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/backoffice/login";

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/backoffice/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/backoffice";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/backoffice/:path*"],
};
