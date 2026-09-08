"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { optionalStr, requiredStr } from "@/lib/form-utils";
import { toTitleCase } from "@/lib/text-normalize";

export async function actualizarCliente(clientId: number, formData: FormData) {
  await requirePermission("clientes.gestionar");

  const birthDateRaw = optionalStr(formData.get("birthDate"));

  await withRetry(() =>
    prisma.client.update({
      where: { id: clientId },
      data: {
        firstName: toTitleCase(requiredStr(formData.get("firstName"), "Nombre")),
        lastName: toTitleCase(requiredStr(formData.get("lastName"), "Apellido")),
        docId: optionalStr(formData.get("docId")),
        phone: optionalStr(formData.get("phone")),
        email: optionalStr(formData.get("email")),
        birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
      },
    })
  );

  revalidatePath(`/backoffice/clientes/${clientId}`);
}
