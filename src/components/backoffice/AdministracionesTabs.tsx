import Link from "next/link";

const tabs = [
  { key: "contratos", href: "/backoffice/administraciones", label: "Contratos" },
  { key: "liquidaciones", href: "/backoffice/administraciones/liquidaciones", label: "Liquidaciones" },
  { key: "actualizaciones", href: "/backoffice/administraciones/actualizaciones", label: "Actualizaciones" },
  { key: "morosidad", href: "/backoffice/administraciones/morosidad", label: "Morosidad" },
] as const;

export function AdministracionesTabs({
  active,
}: {
  active: "contratos" | "liquidaciones" | "actualizaciones" | "morosidad";
}) {
  return (
    <div className="mb-6 flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
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
