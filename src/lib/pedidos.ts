import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import type { PedidoEstado } from "@/generated/prisma/client";

const tomadoPorSelect = { select: { firstName: true, lastName: true, username: true } } as const;

// Mismo criterio que creatorLabel (lib/presupuestos.ts) — nombre y
// apellido si están cargados, si no el username.
export function tomadoLabel(profile: { firstName: string | null; lastName: string | null; username: string } | null) {
  if (!profile) return null;
  return profile.firstName && profile.lastName ? `${profile.firstName} ${profile.lastName}` : `@${profile.username}`;
}

// creadoPor es null cuando el pedido vino del formulario público de la
// landing (ver crearPedidoPublico) — no es que falte el dato, es que no
// hay ningún agente detrás.
export function creadoPorLabel(profile: { username: string } | null) {
  return profile ? `@${profile.username}` : "Sitio web";
}

export async function getPedidos(estado?: PedidoEstado) {
  return withRetry(() =>
    prisma.pedido.findMany({
      where: estado ? { estado } : undefined,
      include: { creadoPor: { select: { username: true } }, tomadoPor: tomadoPorSelect },
      orderBy: { createdAt: "desc" },
    })
  );
}

export async function getPedidoById(id: number) {
  return withRetry(() =>
    prisma.pedido.findUnique({
      where: { id },
      include: {
        creadoPor: { select: { username: true } },
        tomadoPor: tomadoPorSelect,
        matchedListing: { select: { id: true, title: true } },
      },
    })
  );
}
