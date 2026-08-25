import Link from "next/link";

const tabs = [
  { href: "/backoffice/administraciones", label: "Contratos" },
  { href: "/backoffice/administraciones/liquidaciones", label: "Liquidaciones" },
  { href: "/backoffice/administraciones/actualizaciones", label: "Actualizaciones" },
];

export function AdministracionesTabs({ active }: { active: "contratos" | "liquidaciones" | "actualizaciones" }) {
  return (
    <div className="mb-6 flex gap-1 border-b border-border">
      {tabs.map((tab, i) => {
        const key = (["contratos", "liquidaciones", "actualizaciones"] as const)[i];
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
