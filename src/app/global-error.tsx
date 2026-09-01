"use client";

import { Geist } from "next/font/google";
import { ThemeScript } from "@/components/ThemeScript";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Único caso que NO cae dentro de backoffice/(app)/error.tsx ni de
// (site)/error.tsx: un error en el root layout mismo. Reemplaza TODO,
// así que tiene que traer su propio html/body (ver docs de Next) — se
// repite acá lo mínimo del layout real (fuente, tema, globals.css) para
// que no se vea como una página totalmente distinta.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Algo salió mal</p>
        <p className="max-w-sm text-sm text-muted">
          {error.message || "Ocurrió un error inesperado."}
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-sm hover:bg-accent-strong transition-colors cursor-pointer"
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
