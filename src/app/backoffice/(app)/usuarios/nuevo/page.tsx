import { requirePermission } from "@/lib/auth";
import { RolePermissionsFields } from "@/components/backoffice/RolePermissionsFields";
import { ROLE_DEFAULT_PERMISSIONS } from "@/lib/permissions";
import { crearUsuario } from "../actions";

export default async function NuevoUsuarioPage() {
  await requirePermission("usuarios.gestionar");

  return (
    <div className="max-w-5xl w-full mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nuevo Usuario</h1>
        <p className="text-xs text-muted mt-1">Crea un nuevo usuario de staff para otorgarle acceso al sistema de gestión.</p>
      </div>

      <form action={crearUsuario} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <fieldset className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-surface p-5 sm:p-6 shadow-sm">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted">Datos de Acceso</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input name="firstName" placeholder="Nombre" className="field" />
              <input name="lastName" placeholder="Apellido" className="field" />
              <input name="email" type="email" placeholder="Email *" required className="field" />
              <input name="username" placeholder="Nombre de usuario (sin @) *" required className="field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <input name="password" type="password" placeholder="Contraseña inicial *" required minLength={8} className="field" />
              <p className="text-[11px] text-muted">Se la pasás vos al usuario por fuera del sistema; puede cambiarla después.</p>
            </div>
          </fieldset>

          <RolePermissionsFields defaultRole="AGENTE" defaultPermissions={ROLE_DEFAULT_PERMISSIONS.AGENTE} />
        </div>

        <div className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-surface p-5 sm:p-6 shadow-sm">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-muted">Ficha Pública (Sitio)</legend>
            <input name="phone" type="tel" placeholder="Teléfono de contacto" className="field" />
            <textarea name="bio" rows={3} placeholder="Descripción breve para el perfil público..." className="field" />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="photo" className="text-xs font-semibold text-foreground/80">
                Foto de Perfil (máx. 4MB)
              </label>
              <input id="photo" name="photo" type="file" accept="image/png,image/jpeg,image/webp" className="field" />
            </div>
            <label className="flex items-center gap-2.5 text-xs font-semibold text-foreground cursor-pointer pt-1">
              <input type="checkbox" name="showOnPublicSite" className="h-4 w-4 accent-accent rounded" />
              Mostrar en el equipo del sitio público
            </label>

            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-accent py-3 text-xs font-bold text-accent-foreground shadow-sm hover:bg-accent-strong transition-all cursor-pointer"
            >
              Crear Usuario
            </button>
          </fieldset>
        </div>
      </form>
    </div>
  );
}
