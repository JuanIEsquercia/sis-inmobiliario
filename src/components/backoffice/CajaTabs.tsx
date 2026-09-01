import Link from "next/link";

const tabs = [
  { key: "movimientos", href: "/backoffice/caja", label: "Movimientos" },
  { key: "ventas", href: "/backoffice/caja/ventas", label: "Ventas" },
  { key: "tasaciones", href: "/backoffice/caja/tasaciones", label: "Tasaciones" },
  { key: "comisiones", href: "/backoffice/caja/comisiones", label: "Comisión alquileres" },
  { key: "administracion", href: "/backoffice/caja/administracion", label: "Administración" },
  { key: "egresos", href: "/backoffice/caja/egresos", label: "Egresos" },
  { key: "consolidado", href: "/backoffice/caja/consolidado", label: "Consolidado" },
  { key: "proyeccion", href: "/backoffice/caja/proyeccion", label: "Proyección" },
] as const;

export function CajaTabs({
  active,
}: {
  active:
    | "movimientos"
    | "ventas"
    | "tasaciones"
    | "comisiones"
    | "administracion"
    | "egresos"
    | "consolidado"
    | "proyeccion";
}) {
  return (
    <div className="mb-6 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-border/60 pb-3">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
              isActive
                ? "bg-accent text-accent-foreground shadow-sm shadow-accent/20"
                : "text-muted hover:bg-surface hover:text-foreground border border-border/40"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
