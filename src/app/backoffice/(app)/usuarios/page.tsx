import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { updateUserRole, toggleUserActive } from "./actions";

export default async function UsuariosPage() {
  await requireAdmin();

  const profiles = await withRetry(() => prisma.profile.findMany({ orderBy: { createdAt: "asc" } }));

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-foreground">Usuarios</h1>
      <p className="mb-6 text-sm text-muted">
        Para dar de alta un login nuevo, hacelo desde el dashboard de Supabase (Authentication → Users
        → Add user) — el perfil se crea acá solo, con rol Agente por defecto.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-foreground">{p.fullName ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{p.email}</td>
                <td className="px-4 py-3 text-foreground">{p.role === "ADMIN" ? "Admin" : "Agente"}</td>
                <td className="px-4 py-3 text-muted">{p.isActive ? "Activo" : "Inactivo"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <form action={updateUserRole.bind(null, p.id, p.role === "ADMIN" ? "AGENTE" : "ADMIN")}>
                      <button type="submit" className="rounded-full border border-border px-3 py-1 text-xs hover:bg-surface">
                        {p.role === "ADMIN" ? "Hacer agente" : "Hacer admin"}
                      </button>
                    </form>
                    <form action={toggleUserActive.bind(null, p.id, !p.isActive)}>
                      <button type="submit" className="rounded-full border border-border px-3 py-1 text-xs hover:bg-surface">
                        {p.isActive ? "Desactivar" : "Activar"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
