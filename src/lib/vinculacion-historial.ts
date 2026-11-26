import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { normalizarCodigo } from "@/lib/property-codes";
import { getVinculacionesHistorial } from "@/lib/propiedades";

// Vinculación del Historial (Unit) con las fichas (Listing). Vive acá, y
// no en la server action, para que la usen igual la pantalla
// (/backoffice/historial/vincular) y el script de la ventana de migración
// (scripts/vincular-historial.ts).

// Vincula una unidad del Historial con su ficha. De paso normaliza el
// código ("GARC1-359" -> "359") si no lo tiene otra unidad: si lo tiene,
// son la misma propiedad cargada dos veces y eso se unifica desde la
// ficha del contrato, no acá.
//
// Dirección (decisión del 2026-11-26): con `usarDireccionFicha`, la unidad
// toma la dirección y la localidad de la ficha, y la que tenía se guarda en
// sus notas — ahí suele estar el piso, la UF o la manzana que distingue a
// una unidad de otra del mismo edificio, y no se puede perder.
export async function vincularUnidadConFicha(
  unitId: number,
  listingId: number,
  usarDireccionFicha: boolean
): Promise<"ok" | "conflicto"> {
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

// Vincula de una vez todas las que coinciden por código y cuya dirección
// coincide o es parecida, tomando la dirección de la ficha. Las de
// dirección distinta nunca van en lote: pueden ser un código mal cargado.
export async function vincularCoincidentesEnLote(): Promise<{ vinculadas: number; conflictos: number; pendientes: number }> {
  const filas = await getVinculacionesHistorial();
  let vinculadas = 0;
  let conflictos = 0;
  for (const f of filas) {
    if (f.estado === "para-vincular" && f.coincidencia !== "distinta" && f.ficha) {
      const r = await withRetry(() => vincularUnidadConFicha(f.unidad.id, f.ficha!.id, true));
      if (r === "ok") vinculadas++;
      else conflictos++;
    }
  }
  const pendientes = filas.filter((f) => f.estado === "para-vincular" && f.coincidencia === "distinta").length;
  return { vinculadas, conflictos, pendientes };
}
