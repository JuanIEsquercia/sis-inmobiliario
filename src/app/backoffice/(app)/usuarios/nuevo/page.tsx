import { requirePermission } from "@/lib/auth";
import { RolePermissionsFields } from "@/components/backoffice/RolePermissionsFields";
import { ROLE_DEFAULT_PERMISSIONS } from "@/lib/permissions";
import { crearUsuario } from "../actions";

export default async function NuevoUsuarioPage() {
  await requirePermission("usuarios.gestionar");

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Nuevo usuario</h1>

      <form action={crearUsuario} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input name="firstName" placeholder="Nombre" className="field" />
          <input name="lastName" placeholder="Apellido" className="field" />
        </div>
        <input name="email" type="email" placeholder="Email*" required className="field" />
        <input name="username" placeholder="Nombre de usuario (sin @)*" required className="field" />
        <div className="flex flex-col gap-1.5">
          <input name="password" type="password" placeholder="Contraseña inicial*" required minLength={8} className="field" />
          <p className="text-xs text-muted">Se la pasás vos al usuario por fuera del sistema; puede cambiarla después.</p>
        </div>

        <RolePermissionsFields defaultRole="AGENTE" defaultPermissions={ROLE_DEFAULT_PERMISSIONS.AGENTE} />

        <fieldset className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4">
          <legend className="px-1 text-sm font-medium text-foreground">
            Ficha pública <span className="font-normal text-muted">(opcional, para el equipo en el sitio)</span>
          </legend>
          <input name="phone" type="tel" placeholder="Teléfono de contacto" className="field" />
          <textarea name="bio" rows={3} placeholder="Descripción breve — qué hace, hace cuánto está en la inmobiliaria..." className="field" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="photo" className="text-xs text-muted">
              Foto (PNG/JPG/WEBP, máx. 4MB)
            </label>
            <input id="photo" name="photo" type="file" accept="image/png,image/jpeg,image/webp" className="field" />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="showOnPublicSite" className="h-4 w-4 accent-accent" />
            Mostrar en el sitio público
          </label>
        </fieldset>

        <button
          type="submit"
          className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
        >
          Crear usuario
        </button>
      </form>
    </div>
  );
}
