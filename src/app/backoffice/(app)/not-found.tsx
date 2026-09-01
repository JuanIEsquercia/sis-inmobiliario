import Link from "next/link";

// Mismo criterio que error.tsx en esta carpeta: al vivir en (app)/, esto
// reemplaza solo el <main> — el Sidebar sigue ahí. Antes no había
// not-found.tsx acá, así que cualquier notFound() (hay 11 en fichas de
// detalle: venta, tasación, comisión, cliente, pedido, usuario...) caía
// en el 404 genérico de Next, sin navegación para volver.
export default function BackofficeNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">No encontrado</p>
        <p className="text-sm font-medium text-foreground">Esto no existe o ya no está disponible.</p>
      </div>
      <Link
        href="/backoffice"
        className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-sm hover:bg-accent-strong transition-colors"
      >
        Volver al panel
      </Link>
    </div>
  );
}
