"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { conAviso } from "@/lib/accion";
import { Prisma } from "@/generated/prisma/client";
import { normalizarCodigo } from "@/lib/property-codes";
import { getVinculacionesHistorial } from "@/lib/propiedades";

function texto(formData: FormData, campo: string): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  return v === "" ? null : v;
}

// Corrige los datos de la unidad (dirección mal cargada, localidad, tipo,
// código). Como contratos, ventas y tasaciones apuntan a la unidad y no
// copian la dirección, el cambio se ve en todas sus operaciones.
//
// El código solo se puede cambiar por uno libre: si ya existe en otra
// unidad, son la misma propiedad cargada dos veces, y eso se resuelve
// desde la ficha del contrato ("Corregir código de propiedad"), que
// mueve el contrato a la unidad correcta.
export const actualizarUnidad = conAviso(async function actualizarUnidad(unitId: number, formData: FormData) {
  await requirePermission("historial.editar");

  const address = texto(formData, "address");
  const propertyCode = texto(formData, "propertyCode");
  if (!address) throw new Error("La dirección no puede quedar vacía.");
  if (!propertyCode) throw new Error("El código de propiedad no puede quedar vacío.");

  try {
    await withRetry(() =>
      prisma.unit.update({
        where: { id: unitId },
        data: {
          address,
          propertyCode,
          city: texto(formData, "city"),
          propertyType: texto(formData, "propertyType"),
          notes: texto(formData, "notes"),
        },
      })
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error(
        `El código ${propertyCode} ya lo tiene otra propiedad. Si es la misma, corregilo desde la ficha del contrato para unificarlas.`
      );
    }
    throw err;
  }

  revalidatePath("/backoffice/historial");
  revalidatePath(`/backoffice/historial/${unitId}`);
  revalidatePath("/backoffice/administraciones", "layout");
});

// --- Vinculación con las fichas de propiedad ------------------------------

// Vincula una unidad del Historial con su ficha. De paso normaliza el
// código ("GARC1-359" -> "359") si no lo tiene otra unidad: si lo tiene,
// son la misma propiedad cargada dos veces y eso se unifica desde la
// ficha del contrato, no acá.
//
// Dirección (decisión del 2026-11-26): con `usarDireccionFicha`, la unidad
// toma la dirección y la localidad de la ficha, y la que tenía se guarda en
// sus notas — ahí suele estar el piso, la UF o la manzana que distingue a
// una unidad de otra del mismo edificio, y no se puede perder.
async function vincular(unitId: number, listingId: number, usarDireccionFicha: boolean): Promise<"ok" | "conflicto"> {
  const [ficha, unidad] = await Promise.all([
    prisma.listing.findUnique({ where: { id: listingId }, select: { code: true, address: true, city: true, unit: { select: { id: true } } } }),
    prisma.unit.findUnique({ where: { id: unitId }, select: { address: true, city: true, notes: true } }),
  ]);
  if (!ficha) throw new Error("La ficha ya no existe.");
  if (!unidad) throw new Error("La propiedad del Historial ya no existe.");
  if (ficha.unit && ficha.unit.id !== unitId) return "conflicto";
  const codigo = normalizarCodigo(ficha.code);
  const otra = codigo ? await prisma.unit.findUnique({ where: { propertyCode: codigo }, select: { id: true } }) : null;

  const cambiaDireccion = usarDireccionFicha && !!ficha.address && ficha.address !== unidad.address;
  const anterior = `Dirección anterior en el Historial: ${unidad.address}${unidad.city ? ` (${unidad.city})` : ""}`;
  await prisma.unit.update({
    where: { id: unitId },
    data: {
      listingId,
      ...(codigo && (!otra || otra.id === unitId) ? { propertyCode: codigo } : {}),
      ...(cambiaDireccion
        ? {
            address: ficha.address!,
            city: ficha.city ?? unidad.city,
            notes: unidad.notes ? `${unidad.notes}\n${anterior}` : anterior,
          }
        : {}),
    },
  });
  return "ok";
}

function revalidarHistorial() {
  revalidatePath("/backoffice/historial", "layout");
  revalidatePath("/backoffice/propiedades", "layout");
}

export const vincularUnidad = conAviso(async function vincularUnidad(unitId: number, listingId: number, usarDireccionFicha: boolean) {
  await requirePermission("historial.editar");
  const r = await withRetry(() => vincular(unitId, listingId, usarDireccionFicha));
  if (r === "conflicto") {
    throw new Error("Esa ficha ya está vinculada a otra propiedad del Historial. Si son la misma, unificalas desde la ficha del contrato.");
  }
  revalidarHistorial();
});

export const desvincularUnidad = conAviso(async function desvincularUnidad(unitId: number) {
  await requirePermission("historial.editar");
  await withRetry(() => prisma.unit.update({ where: { id: unitId }, data: { listingId: null } }));
  revalidarHistorial();
});

// Vincula de una vez todas las que coinciden por código y cuya dirección
// coincide o es parecida, tomando la dirección de la ficha (la anterior
// queda en las notas). Las de dirección distinta nunca van en lote:
// pueden ser un código mal cargado, y se resuelven una por una.
export const vincularCoincidentes = conAviso(async function vincularCoincidentes() {
  await requirePermission("historial.editar");
  const filas = await getVinculacionesHistorial();
  for (const f of filas) {
    if (f.estado === "para-vincular" && f.coincidencia !== "distinta" && f.ficha) {
      await withRetry(() => vincular(f.unidad.id, f.ficha!.id, true));
    }
  }
  revalidarHistorial();
});

// Borra una unidad que quedó sin contratos, ventas ni tasaciones (pruebas
// o cargas repetidas cuyas operaciones ya se eliminaron). Con cualquier
// operación colgando no se borra: es historia real de la propiedad.
export const eliminarUnidad = conAviso(async function eliminarUnidad(unitId: number) {
  await requirePermission("historial.editar");

  const unidad = await withRetry(() =>
    prisma.unit.findUnique({
      where: { id: unitId },
      select: { _count: { select: { contracts: true, sales: true, appraisals: true } } },
    })
  );
  if (!unidad) throw new Error("La propiedad ya no existe.");
  const { contracts, sales, appraisals } = unidad._count;
  if (contracts + sales + appraisals > 0) {
    throw new Error(
      "No se puede eliminar: todavía tiene contratos, ventas o tasaciones. Eliminá primero esas operaciones."
    );
  }

  await withRetry(() => prisma.unit.delete({ where: { id: unitId } }));
  revalidatePath("/backoffice/historial");
  redirect("/backoffice/historial");
});
