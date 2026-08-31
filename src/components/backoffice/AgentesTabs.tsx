import Link from "next/link";

const tabs = [
  { key: "saldos", href: "/backoffice/agentes", label: "Saldos" },
  { key: "esquema", href: "/backoffice/agentes/esquema", label: "Esquema de comisiones" },
] as const;

export function AgentesTabs({
  active,
  showEsquema = false,
}: {
  active: "saldos" | "esquema";
  showEsquema?: boolean;
}) {
  return (
    <div className="mb-6 flex gap-1 border-b border-border">
      {tabs
        .filter((tab) => tab.key !== "esquema" || showEsquema)
        .map((tab) => {
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
