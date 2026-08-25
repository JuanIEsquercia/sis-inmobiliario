import Link from "next/link";

const tabs = [
  { href: "/backoffice/caja", label: "Movimientos" },
  { href: "/backoffice/caja/ventas", label: "Ventas" },
  { href: "/backoffice/caja/tasaciones", label: "Tasaciones" },
  { href: "/backoffice/caja/comisiones", label: "Comisiones" },
];

export function CajaTabs({ active }: { active: "movimientos" | "ventas" | "tasaciones" | "comisiones" }) {
  return (
    <div className="mb-6 flex gap-1 border-b border-border">
      {tabs.map((tab, i) => {
        const key = (["movimientos", "ventas", "tasaciones", "comisiones"] as const)[i];
        const isActive = key === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
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
