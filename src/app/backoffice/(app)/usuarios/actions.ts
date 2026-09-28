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
import { toTitleCaseOrNull } from "@/lib/text-normalize";
import { Prisma, type Profile, type StaffRole } from "@/generated/prisma/client";

function parsePermissions(formData: FormData): string[] {
  const values = formData.getAll("permissions").map(String);
  return values.filter((v) => ALL_PERMISSION_KEYS.includes(v));
}

const VALID_ROLES: readonly StaffRole[] = ["ADMIN", "AGENTE"];

function parseRole(v: FormDataEntryValue | null): StaffRole {
  const role = requiredStr(v, "Rol");
  if (!VALID_ROLES.includes(role as StaffRole)) throw new Error("Rol inválido.");
  return role as StaffRole;
}

// Candado: dar el rol ADMIN o el permiso usuarios.gestionar equivale a
// entregar el sistema entero (quien lo tiene puede crear/editar
// cualquier usuario, incluido a sí mismo). Solo un ADMIN real puede
// otorgarlos — un AGENTE con usuarios.gestionar puede dar de alta y
// editar agentes, nada más.
function assertCanGrant(actor: Profile, role: StaffRole, permissions: string[]) {
  if (actor.role === "ADMIN") return;
  if (role === "ADMIN" || permissions.includes("usuarios.gestionar")) {
    throw new Error("Solo un administrador puede asignar el rol Admin o el permiso de gestionar usuarios.");
  }
}

// Un no-ADMIN tampoco puede tocar la cuenta de un ADMIN (editarla,
// desactivarla) — sería la otra forma de escalar: bajarle permisos o
// dejar afuera al que sí manda.
async function getTargetOrThrow(actor: Profile, userId: string) {
  const target = await withRetry(() =>
    prisma.profile.findUniqueOrThrow({ where: { id: userId }, select: { role: true, permissions: true } })
  );
  if (target.role === "ADMIN" && actor.role !== "ADMIN") {
    throw new Error("Solo un administrador puede modificar la cuenta de otro administrador.");
  }
  return target;
}

export async function crearUsuario(formData: FormData) {
  const actor = await requirePermission("usuarios.gestionar");

  const email = requiredStr(formData.get("email"), "Email");
  const username = requiredStr(formData.get("username"), "Nombre de usuario").toLowerCase();
  const password = requiredStr(formData.get("password"), "Contraseña");
  const role = parseRole(formData.get("role"));
  const firstName = toTitleCaseOrNull(optionalStr(formData.get("firstName")));
  const lastName = toTitleCaseOrNull(optionalStr(formData.get("lastName")));
  const phone = optionalStr(formData.get("phone"));
  const bio = optionalStr(formData.get("bio"));
  const showOnPublicSite = formData.get("showOnPublicSite") === "on";
  const permissions = parsePermissions(formData);
  assertCanGrant(actor, role, permissions);

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
  revalidatePath("/equipo");
  redirect("/backoffice/usuarios");
}

export async function actualizarUsuario(userId: string, formData: FormData) {
  const actor = await requirePermission("usuarios.gestionar");
  const target = await getTargetOrThrow(actor, userId);

  // Nadie se cambia el rol ni los permisos a sí mismo desde acá (el
  // resto de los datos propios — nombre, foto, bio — sí se editan): lo
  // que mande el form para esos dos campos se ignora y queda lo que ya
  // tenía.
  const isSelf = userId === actor.id;
  const role = isSelf ? target.role : parseRole(formData.get("role"));
  const permissions = isSelf ? target.permissions : parsePermissions(formData);
  assertCanGrant(actor, role, permissions);

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
        firstName: toTitleCaseOrNull(optionalStr(formData.get("firstName"))),
        lastName: toTitleCaseOrNull(optionalStr(formData.get("lastName"))),
        role,
        permissions,
        phone: optionalStr(formData.get("phone")),
        bio: optionalStr(formData.get("bio")),
        showOnPublicSite: formData.get("showOnPublicSite") === "on",
        ...photoData,
      },
    })
  );

  revalidatePath("/backoffice/usuarios");
  revalidatePath("/equipo");
  redirect("/backoffice/usuarios");
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const actor = await requirePermission("usuarios.gestionar");
  if (userId === actor.id) throw new Error("No podés desactivar tu propia cuenta.");
  await getTargetOrThrow(actor, userId);
  await withRetry(() => prisma.profile.update({ where: { id: userId }, data: { isActive } }));
  revalidatePath("/backoffice/usuarios");
  revalidatePath("/equipo");
}

// Resultado que devuelven las acciones de Grupos para que el formulario
// pueda mostrar en pantalla qué pasó (ver FormWithFeedback). Antes estas
// acciones devolvían void: guardaban bien, pero la página volvía idéntica
// y no había forma de saber si el clic había hecho algo — parecía que no
// impactaba nada.
export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

// Los `requirePermission` van SIEMPRE fuera del try: si falta el
// permiso hacen redirect(), que internamente se propaga como excepción
// — atraparla la convertiría en un cartel de error en vez de una
// redirección. Adentro del try queda solo lo que puede fallar de verdad
// (validación y base).
function comoError(err: unknown, fallback: string): ActionResult {
  return { ok: false, error: err instanceof Error ? err.message : fallback };
}

export async function crearGrupoContratos(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const profile = await requirePermission("administraciones.grupos.gestionar");

  try {
    const name = requiredStr(formData.get("name"), "Nombre del grupo");
    const description = optionalStr(formData.get("description"));

    await withRetry(() =>
      prisma.contractGroup.create({ data: { name, description, createdById: profile.id } })
    );

    revalidatePath("/backoffice/usuarios/grupos");
    return { ok: true, message: `Grupo "${name}" creado.` };
  } catch (err) {
    // El nombre es único en la base — el error crudo de Prisma no le
    // dice nada a nadie, así que se traduce.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "Ya existe un grupo con ese nombre." };
    }
    return comoError(err, "No se pudo crear el grupo.");
  }
}

// Editar nombre y descripción de un grupo ya creado. Antes no había
// forma: se creaba con un nombre y quedaba así para siempre.
export async function actualizarGrupoContratos(
  groupId: number,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("administraciones.grupos.gestionar");

  try {
    const name = requiredStr(formData.get("name"), "Nombre del grupo");
    const description = optionalStr(formData.get("description"));

    await withRetry(() => prisma.contractGroup.update({ where: { id: groupId }, data: { name, description } }));

    revalidatePath("/backoffice/usuarios/grupos");
    revalidatePath("/backoffice/administraciones");
    return { ok: true, message: "Datos del grupo guardados." };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "Ya existe otro grupo con ese nombre." };
    }
    return comoError(err, "No se pudo guardar el grupo.");
  }
}

// Borrar un grupo NO borra sus contratos: la FK de Contract.groupId está
// en ON DELETE SET NULL (verificado contra la base), así que los
// contratos quedan "sin grupo" — visibles solo para quien tenga
// administraciones.ver_todos, igual que un contrato recién cargado. Las
// membresías sí se van solas (ON DELETE CASCADE). Por eso no hace falta
// ninguna limpieza manual acá, a diferencia de eliminarContratoDefinitivo.
export async function eliminarGrupoContratos(groupId: number) {
  const profile = await requirePermission("administraciones.grupos.gestionar");

  const group = await withRetry(() =>
    prisma.contractGroup.findUniqueOrThrow({
      where: { id: groupId },
      select: { name: true, _count: { select: { contracts: true } } },
    })
  );
  console.log(
    `[eliminarGrupoContratos] grupo ${groupId} ("${group.name}") eliminado por ${profile.id}. ` +
      `Contratos que quedan sin grupo: ${group._count.contracts}`
  );

  await withRetry(() => prisma.contractGroup.delete({ where: { id: groupId } }));

  revalidatePath("/backoffice/usuarios/grupos");
  revalidatePath("/backoffice/administraciones");
}

// Reemplaza la lista completa de miembros del grupo por la tildada en
// el formulario — más simple que diffear altas/bajas, y el checklist ya
// viene precargado con los miembros actuales.
export async function actualizarMiembrosGrupo(
  groupId: number,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("administraciones.grupos.gestionar");

  const profileIds = formData.getAll("memberIds").map(String);

  try {
    await withRetry(() =>
      prisma.$transaction([
        prisma.profileContractGroup.deleteMany({ where: { groupId } }),
        prisma.profileContractGroup.createMany({
          data: profileIds.map((profileId) => ({ profileId, groupId })),
          skipDuplicates: true,
        }),
      ])
    );
  } catch (err) {
    return comoError(err, "No se pudieron guardar los miembros.");
  }

  revalidatePath("/backoffice/usuarios/grupos");
  return {
    ok: true,
    message:
      profileIds.length === 0
        ? "Grupo sin miembros: sus contratos quedan visibles solo para quien tenga «ver contratos de todos los grupos»."
        : `${profileIds.length} miembro${profileIds.length === 1 ? "" : "s"} con acceso a este grupo.`,
  };
}
