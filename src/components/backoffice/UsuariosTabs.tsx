import Link from "next/link";

const tabs = [
  { key: "usuarios", href: "/backoffice/usuarios", label: "Usuarios" },
  { key: "grupos", href: "/backoffice/usuarios/grupos", label: "Grupos de contratos" },
] as const;

export function UsuariosTabs({
  active,
  showGrupos = false,
}: {
  active: "usuarios" | "grupos";
  showGrupos?: boolean;
}) {
  return (
    <div className="mb-6 flex gap-1 border-b border-border">
      {tabs
        .filter((tab) => tab.key !== "grupos" || showGrupos)
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
