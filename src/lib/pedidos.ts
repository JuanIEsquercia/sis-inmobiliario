import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import type { PedidoEstado } from "@/generated/prisma/client";

export async function getPedidos(estado?: PedidoEstado) {
  return withRetry(() =>
    prisma.pedido.findMany({
      where: estado ? { estado } : undefined,
      include: { creadoPor: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    })
  );
}

export async function getPedidoById(id: number) {
  return withRetry(() =>
    prisma.pedido.findUnique({
      where: { id },
      include: {
        creadoPor: { select: { fullName: true, email: true } },
        matchedListing: { select: { id: true, title: true } },
      },
    })
  );
}
