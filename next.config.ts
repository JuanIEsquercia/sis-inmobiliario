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
