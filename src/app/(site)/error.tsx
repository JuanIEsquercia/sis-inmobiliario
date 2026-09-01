"use client";

import Link from "next/link";
import { useEffect } from "react";

// Boundary del sitio público (Header + Footer siguen renderizando
// alrededor, ver layout.tsx) — mismo criterio que backoffice/(app)/error.tsx.
export default function SiteError({
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
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs font-bold uppercase tracking-wider text-accent">Algo salió mal</p>
      <p className="text-sm text-muted">No pudimos cargar esta página. Podés reintentar o volver al inicio.</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-sm hover:bg-accent-strong transition-colors cursor-pointer"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
