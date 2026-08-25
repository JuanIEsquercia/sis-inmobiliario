import Link from "next/link";
import type { StaffRole } from "@/generated/prisma/client";

const links = [
  { href: "/backoffice", label: "Panel", adminOnly: false },
  { href: "/backoffice/pedidos", label: "Pedidos", adminOnly: false },
  { href: "/backoffice/alquileres", label: "Alquileres", adminOnly: false },
  { href: "/backoffice/usuarios", label: "Usuarios", adminOnly: true },
];

export function Sidebar({ role }: { role: StaffRole }) {
  return (
    <nav className="flex w-52 flex-none flex-col gap-1 border-r border-border px-3 py-6">
      {links
        .filter((link) => !link.adminOnly || role === "ADMIN")
        .map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
    </nav>
  );
}
