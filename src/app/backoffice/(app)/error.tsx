"use client";

import Link from "next/link";
import { useEffect } from "react";

// Boundary de todo lo que vive bajo el shell del backoffice (Sidebar +
// header) — al estar en (app)/, reemplaza solo el <main>, nunca la
// navegación de al lado. Antes de esto no existía NINGÚN error.tsx en
// el proyecto, así que cualquier throw (y son ~50 en las acciones, la
// forma en la que este sistema avisa "falta X" o "esto no cierra") caía
// directo en la pantalla de error genérica de Next, tapando toda la
// pantalla — de ahí que un error de validación se sintiera como que te
// "saca" de la página en vez de avisarte ahí mismo.
export default function BackofficeError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="w-full max-w-md rounded-2xl border border-accent/15 bg-accent-soft p-6 shadow-sm">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-accent">No se pudo completar</p>
        <p className="text-sm font-medium text-foreground">
          {error.message || "Ocurrió un error inesperado."}
        </p>
        {error.digest && <p className="mt-2 text-[10px] text-muted">Código: {error.digest}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-sm hover:bg-accent-strong transition-colors cursor-pointer"
        >
          Reintentar
        </button>
        <Link
          href="/backoffice"
          className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface transition-colors"
        >
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
