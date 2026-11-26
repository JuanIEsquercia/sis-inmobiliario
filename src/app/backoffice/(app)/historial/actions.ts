"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { conAviso } from "@/lib/accion";
import { Prisma } from "@/generated/prisma/client";
import { vincularCoincidentesEnLote, vincularUnidadConFicha } from "@/lib/vinculacion-historial";

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

function revalidarHistorial() {
  revalidatePath("/backoffice/historial", "layout");
  revalidatePath("/backoffice/propiedades", "layout");
}

export const vincularUnidad = conAviso(async function vincularUnidad(unitId: number, listingId: number, usarDireccionFicha: boolean) {
  await requirePermission("historial.editar");
  const r = await withRetry(() => vincularUnidadConFicha(unitId, listingId, usarDireccionFicha));
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

// Vincula de una vez las de dirección igual o parecida (ver
// vincularCoincidentesEnLote); las de dirección distinta, una por una.
export const vincularCoincidentes = conAviso(async function vincularCoincidentes() {
  await requirePermission("historial.editar");
  await vincularCoincidentesEnLote();
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
