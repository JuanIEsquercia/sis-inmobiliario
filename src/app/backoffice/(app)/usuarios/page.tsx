import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { UsuariosTabs } from "@/components/backoffice/UsuariosTabs";
import { KpiStatCard } from "@/components/backoffice/KpiStatCard";
import { ResponsiveDataGrid } from "@/components/backoffice/ResponsiveDataGrid";
import { toggleUserActive } from "./actions";

export default async function UsuariosPage() {
  const profile = await requirePermission("usuarios.ver");
  const canManage = profile.permissions.includes("usuarios.gestionar");

  const profiles = await withRetry(() => prisma.profile.findMany({ orderBy: { createdAt: "asc" } }));

  const totalAdmins = profiles.filter((p) => p.role === "ADMIN").length;
  const totalAgentes = profiles.filter((p) => p.role === "AGENTE").length;

  return (
    <div className="space-y-6">
      <UsuariosTabs
        active="usuarios"
        showGrupos={profile.permissions.includes("administraciones.grupos.gestionar")}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">Usuarios del Sistema</h1>
          <p className="text-xs text-muted mt-1">Administración de accesos, roles y permisos de agentes</p>
        </div>
        {canManage && (
          <Link
            href="/backoffice/usuarios/nuevo"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-xs font-bold uppercase tracking-wider text-accent-foreground transition-all hover:bg-accent-strong hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm shadow-accent/10 shrink-0"
          >
            Nuevo usuario
          </Link>
        )}
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiStatCard
          title="Total Usuarios"
          value={profiles.length}
          subtitle="Cuentas registradas"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <KpiStatCard
          title="Administradores"
          value={totalAdmins}
          subtitle="Acceso total al sistema"
          badge={{ label: "Admin", variant: "accent" }}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <KpiStatCard
          title="Agentes"
          value={totalAgentes}
          subtitle="Gestores de operaciones"
          badge={{ label: "Agente", variant: "neutral" }}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
      </div>

      {/* Grid Adaptativo (Tarjetas Móviles + Tabla Desktop) */}
      <ResponsiveDataGrid
        isEmpty={profiles.length === 0}
        emptyMessage="No hay usuarios registrados."
        mobileCards={
          <>
            {profiles.map((p) => {
              const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ");
              return (
                <div key={p.id} className="rounded-2xl border border-border/60 bg-surface p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3">
                    <div>
                      <Link
                        href={`/backoffice/usuarios/${p.id}`}
                        className="font-bold text-foreground hover:text-accent transition-colors text-base"
                      >
                        @{p.username}
                      </Link>
                      {fullName && <p className="text-xs text-muted font-medium mt-0.5">{fullName}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                        {p.role === "ADMIN" ? "Admin" : "Agente"}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          p.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {p.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-background/50 p-2.5 rounded-xl border border-border/40 text-xs">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Email</span>
                    <span className="font-medium text-foreground">{p.email}</span>
                  </div>

                  {canManage && (
                    <form action={toggleUserActive.bind(null, p.id, !p.isActive)} className="pt-1">
                      <button
                        type="submit"
                        className={`flex h-10 w-full items-center justify-center rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                          p.isActive
                            ? "border-border/60 bg-surface text-muted hover:text-foreground hover:bg-background"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                        }`}
                      >
                        {p.isActive ? "Desactivar Usuario" : "Activar Usuario"}
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link href={`/backoffice/usuarios/${p.id}`} className="font-semibold text-foreground hover:underline">
                      @{p.username}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {[p.firstName, p.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{p.email}</td>
                  <td className="px-4 py-3 text-foreground font-medium">{p.role === "ADMIN" ? "Admin" : "Agente"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        p.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {p.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage && (
                      <form action={toggleUserActive.bind(null, p.id, !p.isActive)}>
                        <button type="submit" className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-surface cursor-pointer">
                          {p.isActive ? "Desactivar" : "Activar"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      />
    </div>
  );
}
