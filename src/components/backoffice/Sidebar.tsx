"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { 
    href: "/backoffice", 
    label: "Panel", 
    permission: null as string | null,
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
    href: "/backoffice/usuarios", 
    label: "Usuarios", 
    permission: "usuarios.ver",
    icon: (className: string) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 0v6M9.75 21h4.5M3 18c0-3.3 5-4 9-4s9 .7 9 4" />
      </svg>
    )
  },
];

export function Sidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex w-60 flex-none flex-col gap-1.5 border-r border-border/50 bg-surface/20 px-4 py-8">
      {links
        .filter((link) => !link.permission || permissions.includes(link.permission))
        .map((link) => {
          const isActive = link.href === "/backoffice"
            ? pathname === "/backoffice"
            : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-accent-soft text-accent border border-accent/10 shadow-sm shadow-accent/5"
                  : "text-muted hover:bg-surface/60 hover:text-foreground border border-transparent"
              }`}
            >
              {link.icon(`h-[16px] w-[16px] flex-none ${isActive ? "text-accent" : "text-muted/70 group-hover:text-foreground"}`)}
              <span>{link.label}</span>
            </Link>
          );
        })}
    </nav>
  );
}

