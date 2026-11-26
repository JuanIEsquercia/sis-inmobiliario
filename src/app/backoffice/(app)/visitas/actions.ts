"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { conAviso } from "@/lib/accion";
import { optionalInt, optionalStr, requiredStr } from "@/lib/form-utils";
import { resolveClient, resolveClientOptional } from "@/lib/backoffice-resolvers";
import { puedeGestionarLlaves } from "@/lib/visitas";
import {
  QUIEN,
  diaComoFecha,
  esDiaValido,
  esTurnoValido,
  inicioDelTurno,
  puede,
  type AccionVisita,
} from "@/lib/visit-rules";
import { Prisma, type KeyLocation } from "@/generated/prisma/client";

function revalidarVisitas(visitId?: number, listingId?: number) {
  revalidatePath("/backoffice/visitas", "layout");
  if (visitId) revalidatePath(`/backoffice/visitas/${visitId}`);
  if (listingId) revalidatePath(`/backoffice/propiedades/${listingId}`);
  // La campanita de alertas vive en el layout del backoffice.
  revalidatePath("/backoffice", "layout");
}

// --- Búsquedas para los selectores ---------------------------------------

export async function buscarClientesVisitas(query: string) {
  await requirePermission("visitas.pedir");
  const q = query.trim();
  if (q.length < 2) return [];
  return withRetry(() =>
    prisma.client.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { docId: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, docId: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 8,
    })
  );
}

// --- Llave de la propiedad (en la ficha) ---------------------------------

export const actualizarLlave = conAviso(async function actualizarLlave(listingId: number, formData: FormData) {
  await requirePermission("propiedades.editar");
  const ubicacion = optionalStr(formData.get("keyLocation"));
  if (ubicacion && ubicacion !== "INMOBILIARIA" && ubicacion !== "CONTACTO") throw new Error("Ubicación de llave inválida.");
  const keyLocation = ubicacion as KeyLocation | null;

  await withRetry(() =>
    prisma.$transaction(async (tx) => {
      const contactoId =
        keyLocation === "CONTACTO" ? await resolveClientOptional(tx, formData, "keyContact", "Contacto que tiene la llave") : null;
      if (keyLocation === "CONTACTO" && !contactoId) {
        throw new Error("Elegí (o cargá) el contacto que tiene la llave.");
      }
      await tx.listing.update({
        where: { id: listingId },
        data: {
          keyLocation,
          keyNumber: keyLocation === "INMOBILIARIA" ? optionalStr(formData.get("keyNumber")) : null,
          keyContactClientId: contactoId,
          keyContactRelation: keyLocation === "CONTACTO" ? optionalStr(formData.get("keyContactRelation")) : null,
          keySets: keyLocation ? optionalInt(formData.get("keySets")) : null,
          keyNotes: keyLocation ? optionalStr(formData.get("keyNotes")) : null,
        },
      });
    })
  );
  revalidarVisitas(undefined, listingId);
});

// --- Pedido de llave (abre la tarjeta de visita) ---------------------------

export const pedirLlave = conAviso(async function pedirLlave(formData: FormData) {
  const profile = await requirePermission("visitas.pedir");
  const listingId = optionalInt(formData.get("listingId"));
  if (!listingId) throw new Error("Falta la propiedad.");

  const dia = requiredStr(formData.get("date"), "Fecha");
  const slot = requiredStr(formData.get("slot"), "Turno");
  if (!esDiaValido(dia)) throw new Error("Fecha inválida.");
  if (!esTurnoValido(slot)) throw new Error("Elegí un turno de la lista (07:00 a 21:30).");
  const startsAt = inicioDelTurno(dia, slot);
  if (startsAt.getTime() < Date.now() - 30 * 60 * 1000) throw new Error("Ese turno ya pasó. Elegí uno a futuro.");

  const tipoInteresado = String(formData.get("interesadoTipo") ?? "cliente");

  let visitId: number;
  try {
    visitId = await withRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const listing = await tx.listing.findUnique({ where: { id: listingId }, select: { keyLocation: true } });
          if (!listing) throw new Error("La propiedad ya no existe.");
          if (!listing.keyLocation) {
            throw new Error("Esta propiedad no tiene indicado dónde está la llave. Cargalo en la ficha antes de pedirla.");
          }

          let clientId: number | null = null;
          let pedidoId: number | null = null;
          if (tipoInteresado === "pedido") {
            pedidoId = optionalInt(formData.get("pedidoId"));
            if (!pedidoId) throw new Error("Elegí el pedido del interesado.");
          } else {
            clientId = await resolveClient(tx, formData, "interesado", "Interesado");
          }

          const visita = await tx.visit.create({
            data: {
              listingId,
              vendedorId: profile.id,
              date: diaComoFecha(dia),
              slot,
              startsAt,
              keyLocation: listing.keyLocation,
              clientId,
              pedidoId,
              events: { create: { type: "PEDIDA", byId: profile.id } },
            },
            select: { id: true },
          });
          return visita.id;
        },
        { timeout: 20000, maxWait: 10000 }
      )
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error(`El turno de las ${slot} del ${dia.split("-").reverse().join("/")} ya está tomado para esta propiedad. Elegí otro.`);
    }
    throw err;
  }

  revalidarVisitas(undefined, listingId);
  redirect(`/backoffice/visitas/${visitId}`);
});

// --- Pasos de la tarjeta ----------------------------------------------------

export const avanzarVisita = conAviso(async function avanzarVisita(visitId: number, accion: AccionVisita, formData: FormData) {
  const profile = await requirePermission("visitas.pedir");
  const gestor = puedeGestionarLlaves(profile);

  const v = await withRetry(() => prisma.visit.findUnique({ where: { id: visitId } }));
  if (!v) throw new Error("La visita ya no existe.");

  // El vendedor da sus pasos; quien gestiona llaves puede dar cualquiera.
  const esSuya = v.vendedorId === profile.id;
  if (QUIEN[accion] === "gestor" ? !gestor : !(esSuya || gestor)) {
    throw new Error(
      QUIEN[accion] === "gestor"
        ? "Este paso lo da quien gestiona las llaves en la inmobiliaria."
        : "Este paso lo da el vendedor de la visita."
    );
  }
  if (!puede(v, accion)) throw new Error("Ese paso ya no corresponde al estado actual de la visita. Recargá la página.");

  const ahora = new Date();
  let data: Prisma.VisitUpdateInput;
  let evento: Prisma.VisitEventCreateWithoutVisitInput["type"];
  let nota: string | null = null;

  switch (accion) {
    case "retirar":
      data = { status: "RETIRADA", retiradaAt: ahora };
      evento = "RETIRADA";
      break;
    case "coordinar":
      data = { status: "COORDINADA" };
      evento = "COORDINADA";
      break;
    case "realizar": {
      const outcomeId = optionalInt(formData.get("outcomeId"));
      if (!outcomeId) throw new Error("Elegí el resultado de la visita.");
      const outcome = await withRetry(() => prisma.visitOutcome.findUnique({ where: { id: outcomeId } }));
      if (!outcome?.isActive) throw new Error("Elegí un resultado de la lista.");
      data = { status: "REALIZADA", outcome: { connect: { id: outcomeId } } };
      evento = "REALIZADA";
      nota = outcome.name;
      break;
    }
    case "devolver":
      data = { status: "DEVUELTA", devueltaAt: ahora };
      evento = "DEVUELTA";
      break;
    case "confirmarDevolucion":
      data = { returnConfirmedAt: ahora, returnConfirmedBy: { connect: { id: profile.id } } };
      evento = "DEVOLUCION_CONFIRMADA";
      break;
    case "cancelar":
      nota = optionalStr(formData.get("cancelReason"));
      // Si la llave de la inmobiliaria estaba retirada, cancelar es
      // devolverla: queda pendiente de que la confirmen.
      data = {
        status: "CANCELADA",
        cancelReason: nota,
        ...(v.keyLocation === "INMOBILIARIA" && v.retiradaAt && !v.devueltaAt ? { devueltaAt: ahora } : {}),
      };
      evento = "CANCELADA";
      break;
  }

  await withRetry(() =>
    prisma.visit.update({
      where: { id: visitId },
      data: { ...data, events: { create: { type: evento, byId: profile.id, note: nota } } },
    })
  );
  revalidarVisitas(visitId, v.listingId);
});

// --- Categorías de resultado ---------------------------------------------

export const crearCategoria = conAviso(async function crearCategoria(formData: FormData) {
  await requirePermission("visitas.categorias");
  const name = requiredStr(formData.get("name"), "Nombre");
  const max = await withRetry(() => prisma.visitOutcome.aggregate({ _max: { sortOrder: true } }));
  try {
    await withRetry(() => prisma.visitOutcome.create({ data: { name, sortOrder: (max._max.sortOrder ?? 0) + 1 } }));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new Error(`Ya existe "${name}".`);
    throw err;
  }
  revalidatePath("/backoffice/visitas/categorias");
});

export const actualizarCategoria = conAviso(async function actualizarCategoria(id: number, formData: FormData) {
  await requirePermission("visitas.categorias");
  const name = requiredStr(formData.get("name"), "Nombre");
  try {
    await withRetry(() =>
      prisma.visitOutcome.update({ where: { id }, data: { name, isActive: formData.get("isActive") === "on" } })
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new Error(`Ya existe "${name}".`);
    throw err;
  }
  revalidatePath("/backoffice/visitas/categorias");
});

export const moverCategoria = conAviso(async function moverCategoria(id: number, direccion: "antes" | "despues") {
  await requirePermission("visitas.categorias");
  const todas = await withRetry(() => prisma.visitOutcome.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } }));
  const ids = todas.map((c) => c.id);
  const i = ids.indexOf(id);
  const j = direccion === "antes" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await withRetry(() =>
    prisma.$transaction(ids.map((cid, k) => prisma.visitOutcome.update({ where: { id: cid }, data: { sortOrder: k + 1 } })))
  );
  revalidatePath("/backoffice/visitas/categorias");
});
