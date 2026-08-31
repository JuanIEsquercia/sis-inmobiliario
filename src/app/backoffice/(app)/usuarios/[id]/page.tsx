import Image from "next/image";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { RolePermissionsFields } from "@/components/backoffice/RolePermissionsFields";
import { actualizarUsuario } from "../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarUsuarioPage({ params }: PageProps) {
  await requirePermission("usuarios.gestionar");
  const { id } = await params;

  const profile = await withRetry(() => prisma.profile.findUnique({ where: { id } }));
  if (!profile) notFound();

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-xl font-semibold text-foreground">@{profile.username}</h1>
      <p className="mb-6 text-sm text-muted">{profile.email}</p>

      <form action={actualizarUsuario.bind(null, profile.id)} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input name="firstName" placeholder="Nombre" defaultValue={profile.firstName ?? ""} className="field" />
          <input name="lastName" placeholder="Apellido" defaultValue={profile.lastName ?? ""} className="field" />
        </div>
        <input name="username" placeholder="Nombre de usuario" required defaultValue={profile.username} className="field" />

        <RolePermissionsFields defaultRole={profile.role} defaultPermissions={profile.permissions} />

        <fieldset className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4">
          <legend className="px-1 text-sm font-medium text-foreground">
            Ficha pública <span className="font-normal text-muted">(opcional, para el equipo en el sitio)</span>
          </legend>

          {profile.photoUrl && (
            <div className="flex items-center gap-3">
              <Image
                src={profile.photoUrl}
                alt={profile.username}
                width={56}
                height={56}
                unoptimized
                className="h-14 w-14 rounded-full border border-border object-cover"
              />
              <span className="text-xs text-muted">Foto actual — subí una nueva para reemplazarla.</span>
            </div>
          )}

          <input name="phone" type="tel" placeholder="Teléfono de contacto" defaultValue={profile.phone ?? ""} className="field" />
          <textarea
            name="bio"
            rows={3}
            placeholder="Descripción breve — qué hace, hace cuánto está en la inmobiliaria..."
            defaultValue={profile.bio ?? ""}
            className="field"
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="photo" className="text-xs text-muted">
              Foto (PNG/JPG/WEBP, máx. 4MB)
            </label>
            <input id="photo" name="photo" type="file" accept="image/png,image/jpeg,image/webp" className="field" />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="showOnPublicSite" defaultChecked={profile.showOnPublicSite} className="h-4 w-4 accent-accent" />
            Mostrar en el sitio público
          </label>
        </fieldset>

        <button
          type="submit"
          className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
