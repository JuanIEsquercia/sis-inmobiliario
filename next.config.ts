import type { NextConfig } from "next";

// Cabeceras de seguridad para toda respuesta. No hay CSP estricta a
// propósito: Next inyecta scripts inline propios y el tema usa uno
// (ThemeScript), así que exigiría nonces en cada uno — mucho riesgo de
// romper por poca ganancia extra. HSTS lo agrega Vercel solo.
// X-Frame-Options afecta a quién puede embeber NUESTRAS páginas (nadie),
// no a lo que nosotros embebemos (la calculadora de arquiler.com sigue
// funcionando igual).
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Sigue bajo `experimental` en Next 16 — se verificó contra el tipo
  // NextConfig, que no lo acepta en la raíz.
  experimental: {
    serverActions: {
      // El alta de un contrato manda hasta 4 PDF en el mismo envío
      // (contrato, DNI inquilino, DNI garante y documentación extra), y
      // son escaneos unificados que pesan varios MB cada uno.
      //
      // El tope de una Server Action es 1 MB por defecto, y Next rechaza
      // el pedido entero con un 413 ANTES de ejecutar nada: el usuario
      // completaba todo el formulario y al confirmar no pasaba nada, sin
      // mensaje, sin contrato creado y perdiendo lo cargado.
      //
      // 4 MB y no más: Vercel corta cualquier pedido a una función en
      // 4,5 MB, y eso NO se puede configurar (devuelve
      // FUNCTION_PAYLOAD_TOO_LARGE). El margen que queda es para los
      // campos del formulario y el empaquetado multipart. Subirlo más
      // acá no serviría: chocaría igual contra el límite de la
      // plataforma, pero más tarde y con el mismo error.
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "static1.adinco.net" },
      { protocol: "https", hostname: "static1.sosiva451.com" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
