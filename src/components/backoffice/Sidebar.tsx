"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface SubLink {
  href: string;
  label: string;
  permission?: string;
}

interface NavLink {
  href: string;
  label: string;
  permission: string | null;
  icon: (className: string) => React.ReactNode;
  children?: SubLink[];
}

const links: NavLink[] = [
  {
    href: "/backoffice",
    label: "Panel",
    permission: null,
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    )
  },
  {
    href: "/backoffice/pedidos",
    label: "Pedidos",
    permission: "pedidos.ver",
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
        <rect x="3" y="3" width="18" height="18" rx="2.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    )
  },
  {
    href: "/backoffice/administraciones",
    label: "Administraciones",
    permission: "administraciones.ver",
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2M5 21H3m4 0h10M9 7h1m-1 4h1m4-4h1m-1 4h1M9 15h1m4 0h1" />
      </svg>
    ),
    children: [
      { href: "/backoffice/administraciones", label: "Contratos" },
      { href: "/backoffice/administraciones/liquidaciones", label: "Liquidaciones" },
      { href: "/backoffice/administraciones/actualizaciones", label: "Actualizaciones" },
      { href: "/backoffice/administraciones/morosidad", label: "Morosidad" },
    ],
  },
  {
    href: "/backoffice/caja",
    label: "Caja",
    permission: "caja.ver",
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path strokeLinecap="round" d="M6 6v0M18 18v0" />
      </svg>
    ),
    children: [
      { href: "/backoffice/caja", label: "Movimientos" },
      { href: "/backoffice/caja/ventas", label: "Ventas" },
      { href: "/backoffice/caja/tasaciones", label: "Tasaciones" },
      { href: "/backoffice/caja/comisiones", label: "Comisión alquileres" },
      { href: "/backoffice/caja/administracion", label: "Administración" },
      { href: "/backoffice/caja/egresos", label: "Egresos" },
      { href: "/backoffice/caja/consolidado", label: "Consolidado" },
      { href: "/backoffice/caja/proyeccion", label: "Proyección" },
    ],
  },
  {
    href: "/backoffice/historial",
    label: "Historial",
    permission: "historial.ver",
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3.5 2M3.5 9A9 9 0 0 1 12 3" />
      </svg>
    )
  },
  {
    href: "/backoffice/clientes",
    label: "Clientes",
    permission: "clientes.ver",
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm14 10v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75" />
      </svg>
    )
  },
  {
    href: "/backoffice/agentes",
    label: "Pagos a agentes",
    permission: null,
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
        <rect x="2.5" y="6.5" width="19" height="13" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 10.5h19" />
        <circle cx="7" cy="15" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
    children: [
      { href: "/backoffice/agentes", label: "Saldos" },
      { href: "/backoffice/agentes/esquema", label: "Esquema de comisiones", permission: "comisiones.ver" },
    ],
  },
  {
    href: "/backoffice/usuarios",
    label: "Usuarios",
    permission: "usuarios.ver",
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 0v6M9.75 21h4.5M3 18c0-3.3 5-4 9-4s9 .7 9 4" />
      </svg>
    ),
    children: [
      { href: "/backoffice/usuarios", label: "Usuarios" },
      { href: "/backoffice/usuarios/grupos", label: "Grupos de contratos", permission: "administraciones.grupos.gestionar" },
    ],
  },
  {
    href: "/backoffice/sitio",
    label: "Sitio público",
    permission: "sitio.gestionar",
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M12 3c2.5 2.7 3.8 6 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-6-3.8-9s1.3-6.3 3.8-9Z" />
      </svg>
    )
  },
];

// Un link "hijo" está activo si es el de prefijo más largo que matchea
// el pathname actual — necesario porque el href de la sección (ej.
// "/backoffice/administraciones") es también prefijo de sus propios
// hermanos ("/backoffice/administraciones/liquidaciones").
function activeChildHref(pathname: string, children: SubLink[]): string | null {
  const matches = children.filter((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));
  if (matches.length === 0) return null;
  return matches.reduce((longest, c) => (c.href.length > longest.href.length ? c : longest)).href;
}

interface SidebarProps {
  permissions: string[];
  className?: string;
  onLinkClick?: () => void;
}

export function Sidebar({ permissions, className, onLinkClick }: SidebarProps) {
  const pathname = usePathname();
  // Preferencia explícita del usuario sobre cada sección (desplegada o
  // contraída), aparte de en qué ruta esté parado. Sin entrada acá, el
  // default es "desplegada si estoy adentro de esa sección" — con
  // entrada, la elección manual manda incluso estando adentro, para que
  // siempre haya una forma de volver a contraerla (la flecha).
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  return (
    <nav className={`flex flex-col gap-1.5 px-4 py-8 ${className || ""}`}>
      {links
        .filter((link) => !link.permission || permissions.includes(link.permission))
        .map((link) => {
          const isActive = link.href === "/backoffice"
            ? pathname === "/backoffice"
            : pathname.startsWith(link.href);

          const visibleChildren = link.children?.filter(
            (child) => !child.permission || permissions.includes(child.permission)
          );
          const hasChildren = !!visibleChildren && visibleChildren.length > 0;
          const override = overrides[link.href];
          const isExpanded = override ?? isActive;
          const activeChild = isActive && visibleChildren ? activeChildHref(pathname, visibleChildren) : null;

          return (
            <div key={link.href} className="flex flex-col">
              <div
                className={`flex items-center rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-accent-soft text-accent border border-accent/10 shadow-sm shadow-accent/5"
                    : "text-muted hover:bg-surface/60 hover:text-foreground border border-transparent"
                }`}
              >
                <Link
                  href={link.href}
                  onClick={(e) => {
                    if (hasChildren && !isExpanded) {
                      e.preventDefault();
                      setOverrides((prev) => ({ ...prev, [link.href]: true }));
                    } else {
                      onLinkClick?.();
                    }
                  }}
                  className="flex flex-1 items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  {link.icon(`h-[16px] w-[16px] flex-none ${isActive ? "text-accent" : "text-muted/70"}`)}
                  <span>{link.label}</span>
                </Link>
                {hasChildren && (
                  <button
                    type="button"
                    onClick={() => setOverrides((prev) => ({ ...prev, [link.href]: !isExpanded }))}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? `Contraer ${link.label}` : `Desplegar ${link.label}`}
                    className="mr-2 flex-none rounded-lg p-1.5 hover:bg-surface/80 cursor-pointer"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className={`h-[12px] w-[12px] transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>

              {hasChildren && isExpanded && (
                <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border/60 pl-3">
                  {visibleChildren.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => onLinkClick?.()}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        child.href === activeChild
                          ? "text-accent"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </nav>
  );
}
