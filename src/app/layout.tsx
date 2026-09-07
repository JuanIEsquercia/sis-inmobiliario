import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeScript } from "@/components/ThemeScript";
import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_LOCALE } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DEFAULT_TITLE = `${SITE_NAME} | ${SITE_TAGLINE}: Venta y Alquiler`;
const DEFAULT_DESCRIPTION =
  "Compra, venta y alquiler de casas, departamentos, campos y terrenos en Corrientes. Tasaciones formales y administración de alquileres.";

// Metadata base — cada página del sitio público (home, propiedades,
// ficha, equipo) hereda esto y solo pisa lo que le corresponde (título,
// descripción, imagen) vía su propio `metadata`/`generateMetadata`. El
// backoffice (login incluido) marca explícitamente robots:noindex —
// además de que robots.ts ya lo excluye de rastreo, esto cubre el caso
// de que alguien linkee una URL del panel desde afuera.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: `%s | ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "inmobiliaria Corrientes",
    "casas en venta Corrientes",
    "departamentos en alquiler Corrientes",
    "campos en venta Corrientes",
    "tasaciones Corrientes",
    "administración de alquileres Corrientes",
  ],
  authors: [{ name: SITE_NAME }],
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  // Sin GOOGLE_SITE_VERIFICATION seteada, este campo queda undefined y
  // Next directamente no imprime la etiqueta — no hace falta if/else acá.
  // Sirve para verificar el dominio en Google Search Console por el
  // método "etiqueta HTML" sin tener que tocar código de nuevo: se pega
  // el código que da GSC en la env var y se redeploya.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  openGraph: {
    type: "website",
    locale: SITE_LOCALE,
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
