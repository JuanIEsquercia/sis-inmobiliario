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
    <div className="mb-6 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-border/60 pb-3">
      {tabs
        .filter((tab) => tab.key !== "esquema" || showEsquema)
        .map((tab) => {
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
