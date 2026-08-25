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
