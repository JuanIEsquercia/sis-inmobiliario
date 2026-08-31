"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadStaffPhoto, deleteStaffPhoto } from "@/lib/supabase/storage";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";
import { optionalStr, requiredStr } from "@/lib/form-utils";
import type { StaffRole } from "@/generated/prisma/client";

function parsePermissions(formData: FormData): string[] {
  const values = formData.getAll("permissions").map(String);
  return values.filter((v) => ALL_PERMISSION_KEYS.includes(v));
}

export async function crearUsuario(formData: FormData) {
  await requirePermission("usuarios.gestionar");

  const email = requiredStr(formData.get("email"), "Email");
  const username = requiredStr(formData.get("username"), "Nombre de usuario").toLowerCase();
  const password = requiredStr(formData.get("password"), "Contraseña");
  const role = requiredStr(formData.get("role"), "Rol") as StaffRole;
  const firstName = optionalStr(formData.get("firstName"));
  const lastName = optionalStr(formData.get("lastName"));
  const phone = optionalStr(formData.get("phone"));
  const bio = optionalStr(formData.get("bio"));
  const showOnPublicSite = formData.get("showOnPublicSite") === "on";
  const permissions = parsePermissions(formData);

  const admin = createAdminClient();

  // La subida de foto no depende de que el usuario ya exista (el path
  // es un UUID propio, no el id del perfil) — se pide en paralelo con
  // la creación del login en vez de encadenada después, y si falla no
  // hace perder el alta (mismo criterio que los documentos de
  // contrato), solo evita cargar la foto.
  const file = formData.get("photo");
  const hasPhoto = file instanceof File && file.size > 0;

  const [{ data, error }, photo] = await Promise.all([
    admin.auth.admin.createUser({ email, password, email_confirm: true }),
    hasPhoto
      ? uploadStaffPhoto(file as File).catch((err) => {
          console.error("No se pudo subir la foto del nuevo usuario:", err);
          return null;
        })
      : Promise.resolve(null),
  ]);

  if (error || !data.user) {
    throw new Error(error?.message ?? "No se pudo crear el usuario");
  }

  const userId = data.user.id;
  const photoFields = photo ? { photoUrl: photo.imageUrl, photoStoragePath: photo.storagePath } : {};

  await withRetry(() =>
    prisma.profile.upsert({
      where: { id: userId },
      create: { id: userId, email, username, firstName, lastName, role, permissions, phone, bio, showOnPublicSite, isActive: true, ...photoFields },
      update: { username, firstName, lastName, role, permissions, phone, bio, showOnPublicSite, ...photoFields },
    })
  );

  revalidatePath("/backoffice/usuarios");
  redirect("/backoffice/usuarios");
}

export async function actualizarUsuario(userId: string, formData: FormData) {
  await requirePermission("usuarios.gestionar");

  // Si viene una foto nueva, reemplaza a la anterior — se borra el
  // archivo viejo del bucket para no dejar huérfanos. La subida y la
  // búsqueda de la foto anterior no dependen una de la otra, se piden
  // juntas en vez de encadenadas.
  let photoData: { photoUrl: string; photoStoragePath: string } | null = null;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const [{ storagePath, imageUrl }, previous] = await Promise.all([
      uploadStaffPhoto(file),
      withRetry(() => prisma.profile.findUniqueOrThrow({ where: { id: userId }, select: { photoStoragePath: true } })),
    ]);
    photoData = { photoUrl: imageUrl, photoStoragePath: storagePath };

    if (previous.photoStoragePath) {
      await deleteStaffPhoto(previous.photoStoragePath).catch((err) =>
        console.error(`No se pudo borrar la foto anterior de ${userId}:`, err)
      );
    }
  }

  await withRetry(() =>
    prisma.profile.update({
      where: { id: userId },
      data: {
        username: requiredStr(formData.get("username"), "Nombre de usuario").toLowerCase(),
        firstName: optionalStr(formData.get("firstName")),
        lastName: optionalStr(formData.get("lastName")),
        role: requiredStr(formData.get("role"), "Rol") as StaffRole,
        permissions: parsePermissions(formData),
        phone: optionalStr(formData.get("phone")),
        bio: optionalStr(formData.get("bio")),
        showOnPublicSite: formData.get("showOnPublicSite") === "on",
        ...photoData,
      },
    })
  );

  revalidatePath("/backoffice/usuarios");
  redirect("/backoffice/usuarios");
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  await requirePermission("usuarios.gestionar");
  await withRetry(() => prisma.profile.update({ where: { id: userId }, data: { isActive } }));
  revalidatePath("/backoffice/usuarios");
}

export async function crearGrupoContratos(formData: FormData) {
  const profile = await requirePermission("administraciones.grupos.gestionar");

  const name = requiredStr(formData.get("name"), "Nombre del grupo");
  const description = optionalStr(formData.get("description"));

  await withRetry(() =>
    prisma.contractGroup.create({ data: { name, description, createdById: profile.id } })
  );

  revalidatePath("/backoffice/usuarios/grupos");
}

// Reemplaza la lista completa de miembros del grupo por la tildada en
// el formulario — más simple que diffear altas/bajas, y el checklist ya
// viene precargado con los miembros actuales.
export async function actualizarMiembrosGrupo(groupId: number, formData: FormData) {
  await requirePermission("administraciones.grupos.gestionar");

  const profileIds = formData.getAll("memberIds").map(String);

  await withRetry(() =>
    prisma.$transaction([
      prisma.profileContractGroup.deleteMany({ where: { groupId } }),
      prisma.profileContractGroup.createMany({
        data: profileIds.map((profileId) => ({ profileId, groupId })),
        skipDuplicates: true,
      }),
    ])
  );

  revalidatePath("/backoffice/usuarios/grupos");
}
