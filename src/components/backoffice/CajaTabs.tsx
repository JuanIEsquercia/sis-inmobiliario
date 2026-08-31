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
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm ${
              isActive
                ? "border-accent font-medium text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
