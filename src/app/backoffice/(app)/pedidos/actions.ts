"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requireProfile } from "@/lib/auth";
import { optionalDecimal, optionalInt, optionalStr, requiredStr } from "@/lib/form-utils";
import type { PedidoEstado } from "@/generated/prisma/client";

export async function createPedido(formData: FormData) {
  const profile = await requireProfile();

  const pedido = await withRetry(() =>
    prisma.pedido.create({
      data: {
        clienteNombre: requiredStr(formData.get("clienteNombre"), "Nombre del cliente"),
        clienteTelefono: optionalStr(formData.get("clienteTelefono")),
        clienteEmail: optionalStr(formData.get("clienteEmail")),
        operationType: requiredStr(formData.get("operationType"), "Operación"),
        propertyType: optionalStr(formData.get("propertyType")),
        zona: optionalStr(formData.get("zona")),
        precioMin: optionalDecimal(formData.get("precioMin")),
        precioMax: optionalDecimal(formData.get("precioMax")),
        moneda: optionalStr(formData.get("moneda")),
        ambientesMin: optionalInt(formData.get("ambientesMin")),
        notas: optionalStr(formData.get("notas")),
        creadoPorId: profile.id,
      },
    })
  );

  revalidatePath("/backoffice/pedidos");
  redirect(`/backoffice/pedidos/${pedido.id}`);
}

export async function updatePedidoEstado(id: number, estado: PedidoEstado) {
  await requireProfile();
  await withRetry(() => prisma.pedido.update({ where: { id }, data: { estado } }));
  revalidatePath(`/backoffice/pedidos/${id}`);
  revalidatePath("/backoffice/pedidos");
}
