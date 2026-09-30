"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { uploadPartnerLogo, deletePartnerLogo } from "@/lib/supabase/storage";
import { optionalInt, optionalStr, requiredStr } from "@/lib/form-utils";
import { runSync } from "@/lib/sync";
import type { ActionResult } from "@/app/backoffice/(app)/usuarios/actions";

export async function crearMarca(formData: FormData) {
  const profile = await requirePermission("sitio.gestionar");

  const name = requiredStr(formData.get("name"), "Nombre");
  const linkUrl = optionalStr(formData.get("linkUrl"));
  const sortOrder = optionalInt(formData.get("sortOrder")) ?? 0;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Elegí una imagen");

  const { storagePath, imageUrl } = await uploadPartnerLogo(file);

  await withRetry(() =>
    prisma.partnerLogo.create({
      data: { name, linkUrl, sortOrder, storagePath, imageUrl, createdById: profile.id },
    })
  );

  revalidatePath("/backoffice/sitio");
  revalidatePath("/");
}

export async function actualizarMarca(id: number, formData: FormData) {
  await requirePermission("sitio.gestionar");

  const name = requiredStr(formData.get("name"), "Nombre");
  const linkUrl = optionalStr(formData.get("linkUrl"));
  const sortOrder = optionalInt(formData.get("sortOrder")) ?? 0;
  const isActive = formData.get("isActive") === "on";

  await withRetry(() =>
    prisma.partnerLogo.update({
      where: { id },
      data: { name, linkUrl, sortOrder, isActive },
    })
  );

  revalidatePath("/backoffice/sitio");
  revalidatePath("/");
}

export async function eliminarMarca(id: number) {
  await requirePermission("sitio.gestionar");

  const marca = await withRetry(() => prisma.partnerLogo.delete({ where: { id } }));
  await deletePartnerLogo(marca.storagePath);

  revalidatePath("/backoffice/sitio");
  revalidatePath("/");
}

// Dispara el sync del feed de Adinco a mano, desde el backoffice.
//
// Llama a runSync directo en vez de pegarle a /api/sync: así queda
// sujeto al permiso del usuario (requirePermission) y no hace falta
// tener ningún secreto a mano. El endpoint HTTP sigue existiendo para el
// cron diario y para dispararlo desde afuera.
//
// El requirePermission va FUERA del try, como en el resto del sistema:
// si falta el permiso hace redirect(), que se propaga como excepción, y
// atraparla la convertiría en un cartel de error en vez de una
// redirección.
// La firma (estado previo, formData) es la que pide useActionState, que
// es lo que usa FormWithFeedback para mostrar el resultado al lado del
// botón. Acá no se usa ninguno de los dos argumentos: no hay campos que
// leer, el botón es el formulario entero.
export async function sincronizarFeed(_prev: ActionResult | null, _formData: FormData): Promise<ActionResult> {
  void _prev;
  void _formData;
  await requirePermission("sitio.gestionar");

  try {
    const r = await runSync();

    if (r.skippedUnchanged) {
      return { ok: true, message: "El feed no cambió desde la última sincronización. No había nada para traer." };
    }

    revalidatePath("/backoffice/sitio");
    revalidatePath("/");

    // Se informan los cuatro números aunque den cero: "0 bajas" dice algo
    // distinto a no mostrar la línea, sobre todo cuando lo que se quiere
    // confirmar es justamente que se dieron de baja las que ya no están.
    const partes = [
      `${r.created} alta${r.created === 1 ? "" : "s"}`,
      `${r.updated} actualizada${r.updated === 1 ? "" : "s"}`,
      `${r.delisted} baja${r.delisted === 1 ? "" : "s"}`,
      `${r.unchanged} sin cambios`,
    ];

    const errores = r.parseErrors.length > 0 ? ` · ${r.parseErrors.length} aviso(s) no se pudieron leer` : "";

    return {
      ok: true,
      message: `Listo: ${partes.join(", ")}${errores}. Tardó ${Math.round(r.durationMs / 1000)}s.`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo sincronizar" };
  }
}
