import Link from "next/link";

export default function SiteNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">404</p>
      <p className="text-sm text-foreground">Esta página no existe o ya no está disponible.</p>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-sm hover:bg-accent-strong transition-colors"
        >
          Volver al inicio
        </Link>
        <Link
          href="/propiedades"
          className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface transition-colors"
        >
          Ver propiedades
        </Link>
      </div>
    </div>
  );
}
