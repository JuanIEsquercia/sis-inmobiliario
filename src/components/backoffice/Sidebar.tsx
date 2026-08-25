import Link from "next/link";

const links = [
  { href: "/backoffice", label: "Panel", permission: null as string | null },
  { href: "/backoffice/pedidos", label: "Pedidos", permission: "pedidos.ver" },
  { href: "/backoffice/administraciones", label: "Administraciones", permission: "administraciones.ver" },
  { href: "/backoffice/clientes", label: "Clientes", permission: "clientes.ver" },
  { href: "/backoffice/usuarios", label: "Usuarios", permission: "usuarios.ver" },
];

export function Sidebar({ permissions }: { permissions: string[] }) {
  return (
    <nav className="flex w-52 flex-none flex-col gap-1 border-r border-border px-3 py-6">
      {links
        .filter((link) => !link.permission || permissions.includes(link.permission))
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
