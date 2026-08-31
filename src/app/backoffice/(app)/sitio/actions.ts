"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { uploadPartnerLogo, deletePartnerLogo } from "@/lib/supabase/storage";
import { optionalInt, optionalStr, requiredStr } from "@/lib/form-utils";

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
