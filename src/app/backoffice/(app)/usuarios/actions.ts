"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const permissions = parsePermissions(formData);

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "No se pudo crear el usuario");
  }

  const userId = data.user.id;

  await withRetry(() =>
    prisma.profile.upsert({
      where: { id: userId },
      create: { id: userId, email, username, firstName, lastName, role, permissions, isActive: true },
      update: { username, firstName, lastName, role, permissions },
    })
  );

  revalidatePath("/backoffice/usuarios");
  redirect("/backoffice/usuarios");
}

export async function actualizarUsuario(userId: string, formData: FormData) {
  await requirePermission("usuarios.gestionar");

  await withRetry(() =>
    prisma.profile.update({
      where: { id: userId },
      data: {
        username: requiredStr(formData.get("username"), "Nombre de usuario").toLowerCase(),
        firstName: optionalStr(formData.get("firstName")),
        lastName: optionalStr(formData.get("lastName")),
        role: requiredStr(formData.get("role"), "Rol") as StaffRole,
        permissions: parsePermissions(formData),
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
