import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { UsuariosTabs } from "@/components/backoffice/UsuariosTabs";
import { toggleUserActive } from "./actions";

export default async function UsuariosPage() {
  const profile = await requirePermission("usuarios.ver");
  const canManage = profile.permissions.includes("usuarios.gestionar");

  const profiles = await withRetry(() => prisma.profile.findMany({ orderBy: { createdAt: "asc" } }));

  return (
    <div>
      <UsuariosTabs
        active="usuarios"
        showGrupos={profile.permissions.includes("administraciones.grupos.gestionar")}
      />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Usuarios</h1>
        {canManage && (
          <Link
            href="/backoffice/usuarios/nuevo"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
          >
            Nuevo usuario
          </Link>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                <td className="px-4 py-3">
                  <Link href={`/backoffice/usuarios/${p.id}`} className="font-medium text-foreground hover:underline">
                    @{p.username}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">
                  {[p.firstName, p.lastName].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="px-4 py-3 text-muted">{p.email}</td>
                <td className="px-4 py-3 text-foreground">{p.role === "ADMIN" ? "Admin" : "Agente"}</td>
                <td className="px-4 py-3 text-muted">{p.isActive ? "Activo" : "Inactivo"}</td>
                <td className="px-4 py-3">
                  {canManage && (
                    <form action={toggleUserActive.bind(null, p.id, !p.isActive)}>
                      <button type="submit" className="rounded-full border border-border px-3 py-1 text-xs hover:bg-surface">
                        {p.isActive ? "Desactivar" : "Activar"}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
