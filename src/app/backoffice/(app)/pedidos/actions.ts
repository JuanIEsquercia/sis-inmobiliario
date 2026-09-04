"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { optionalDecimal, optionalInt, optionalStr, requiredStr } from "@/lib/form-utils";
import type { PedidoEstado } from "@/generated/prisma/client";

export async function createPedido(formData: FormData) {
  const profile = await requirePermission("pedidos.crear");

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
  await requirePermission("pedidos.estado");
  await withRetry(() => prisma.pedido.update({ where: { id }, data: { estado } }));
  revalidatePath(`/backoffice/pedidos/${id}`);
  revalidatePath("/backoffice/pedidos");
}

// Exclusivo: si ya lo tomó otro agente, no lo pisa — corta con un error
// claro para que no dos personas llamen al mismo cliente sin saberlo.
// Tomarlo dos veces la misma persona no hace nada raro (queda igual).
export async function tomarPedido(id: number) {
  const profile = await requirePermission("pedidos.estado");

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUniqueOrThrow({
        where: { id },
        select: { tomadoPorId: true, tomadoPor: { select: { firstName: true, lastName: true, username: true } } },
      });
      if (pedido.tomadoPorId && pedido.tomadoPorId !== profile.id) {
        const nombre =
          pedido.tomadoPor!.firstName && pedido.tomadoPor!.lastName
            ? `${pedido.tomadoPor!.firstName} ${pedido.tomadoPor!.lastName}`
            : `@${pedido.tomadoPor!.username}`;
        throw new Error(`Este pedido ya lo tomó ${nombre} — no se puede tomar dos veces.`);
      }
      await tx.pedido.update({ where: { id }, data: { tomadoPorId: profile.id, tomadoAt: new Date() } });
    })
  );

  revalidatePath(`/backoffice/pedidos/${id}`);
  revalidatePath("/backoffice/pedidos");
}

// Solo quien lo tomó puede soltarlo — así queda libre de nuevo para que
// otro (o el mismo, más adelante) lo tome.
export async function soltarPedido(id: number) {
  const profile = await requirePermission("pedidos.estado");

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findUniqueOrThrow({ where: { id }, select: { tomadoPorId: true } });
      if (pedido.tomadoPorId !== profile.id) {
        throw new Error("Solo quien tomó este pedido lo puede soltar.");
      }
      await tx.pedido.update({ where: { id }, data: { tomadoPorId: null, tomadoAt: null } });
    })
  );

  revalidatePath(`/backoffice/pedidos/${id}`);
  revalidatePath("/backoffice/pedidos");
}
