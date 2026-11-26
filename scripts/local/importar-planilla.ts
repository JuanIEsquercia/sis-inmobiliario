// Importa la planilla "UNIFICADO" del panel de Adinco (guardada en JSON con
// el formato de Google Sheets: { values: [[...]] }) a la base LOCAL.
//
// - Fichas que ya existen (mismo Id Aviso): se completa el estado si nadie
//   lo cambió en el backoffice, y el propietario si no tenía.
// - Las que no existen (alquiladas, vendidas, suspendidas, incompletas):
//   se crean sin publicar, con origen Adinco y los datos de la planilla.
//   Si Adinco vuelve a publicar alguna, el sync la actualiza sola.
// - Propietarios: se reutiliza el cliente con el mismo email, teléfono o
//   nombre; si no, se crea.
//
// Se puede correr más de una vez: no duplica fichas ni clientes.
// Uso: npm run local:importar-planilla -- respaldos/planilla/UNIFICADO-2026-11-26.json
import { readFileSync } from "node:fs";
import { assertLocalEnvironment } from "./guard";

assertLocalEnvironment();

async function main() {
  const { prisma } = await import("../../src/lib/prisma");
  const { leerFila } = await import("../../src/lib/planilla-adinco");
  const { normalizeForSearch } = await import("../../src/lib/search-text");
  type Propietario = NonNullable<Extract<ReturnType<typeof leerFila>, { externalId: string }>["propietario"]>;

  const archivo = process.argv[2];
  if (!archivo) throw new Error("Falta el archivo JSON de la planilla.");
  const { values } = JSON.parse(readFileSync(archivo, "utf8")) as { values: string[][] };
  const [encabezado, ...filas] = values;
  if (encabezado[0] !== "Id Aviso" || encabezado[3] !== "Estado") {
    throw new Error(`No parece la planilla de Adinco (encabezado: ${encabezado.slice(0, 4).join(", ")}).`);
  }

  // Propietarios: un cliente por persona, aunque aparezca en varias filas.
  const clientes = new Map<string, number>();
  async function clienteDe(p: Propietario): Promise<{ id: number; nuevo: boolean }> {
    const clave = `${p.firstName} ${p.lastName}`.toLowerCase();
    if (clientes.has(clave)) return { id: clientes.get(clave)!, nuevo: false };
    const existente = await prisma.client.findFirst({
      where: {
        OR: [
          ...(p.email ? [{ email: { equals: p.email, mode: "insensitive" as const } }] : []),
          ...(p.phone ? [{ phone: p.phone }] : []),
          { firstName: { equals: p.firstName, mode: "insensitive" }, lastName: { equals: p.lastName, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    const id = existente?.id ?? (await prisma.client.create({ data: { ...p }, select: { id: true } })).id;
    clientes.set(clave, id);
    return { id, nuevo: !existente };
  }

  const r = { creadas: 0, actualizadas: 0, estadoRespetado: 0, propietarios: 0, clientesNuevos: 0, deducidas: 0, errores: [] as string[] };
  const porEstado: Record<string, number> = {};

  for (const celdas of filas) {
    const f = leerFila(celdas);
    if ("error" in f) {
      r.errores.push(f.error);
      continue;
    }
    porEstado[f.status] = (porEstado[f.status] ?? 0) + 1;

    let ownerClientId: number | null = null;
    if (f.propietario) {
      const c = await clienteDe(f.propietario);
      ownerClientId = c.id;
      if (c.nuevo) r.clientesNuevos++;
    }

    const existente = await prisma.listing.findUnique({
      where: { externalId: f.externalId },
      select: { id: true, statusChangedAt: true, ownerClientId: true },
    });

    if (existente) {
      // El estado que alguien cambió en el backoffice manda sobre Adinco.
      const tocarEstado = !existente.statusChangedAt;
      if (!tocarEstado) r.estadoRespetado++;
      await prisma.listing.update({
        where: { id: existente.id },
        data: {
          ...(tocarEstado ? { status: f.status } : {}),
          ...(tocarEstado && f.status !== "DISPONIBLE" && f.status !== "RESERVADA" ? { isActive: false } : {}),
          ...(ownerClientId && !existente.ownerClientId ? { ownerClientId } : {}),
        },
      });
      if (ownerClientId && !existente.ownerClientId) r.propietarios++;
      r.actualizadas++;
      continue;
    }

    if (f.operacionDeducida) r.deducidas++;
    await prisma.listing.create({
      data: {
        externalId: f.externalId,
        code: f.code,
        origin: "ADINCO",
        status: f.status,
        isActive: false,
        title: `${f.propertyType} en ${f.address ?? f.city ?? "dirección a confirmar"}`,
        operationType: f.operationType,
        propertyType: f.propertyType,
        priceAmount: f.price?.amount ?? null,
        priceCurrency: f.price?.currency ?? null,
        priceRaw: f.price ? null : "Consultar precio",
        expenses: f.expenses,
        address: f.address,
        addressSearch: f.address ? normalizeForSearch(f.address) : null,
        neighborhood: f.neighborhood,
        city: f.city,
        region: f.region,
        country: "Argentina",
        plotArea: f.plotArea,
        floorArea: f.floorArea,
        backyardArea: f.backyardArea,
        ageYears: f.ageYears,
        rooms: f.rooms,
        bathrooms: f.bathrooms,
        openGarages: f.openGarages,
        coveredGarages: f.coveredGarages,
        semiCoveredGarages: f.semiCoveredGarages,
        floorsCount: f.floorsCount,
        sellerName: f.responsable,
        sourceUpdatedAt: f.creado,
        ownerClientId,
        internalNotes: f.operacionDeducida
          ? "Importada de la planilla de Adinco: venta/alquiler deducido por la moneda del precio. Revisar."
          : null,
        rawData: { planillaAdinco: f.original },
      },
    });
    if (ownerClientId) r.propietarios++;
    r.creadas++;
  }

  console.log(`Planilla: ${filas.length} filas.`);
  console.log(`  Fichas creadas: ${r.creadas} (sin publicar) — operación deducida por moneda: ${r.deducidas}`);
  console.log(`  Fichas existentes actualizadas: ${r.actualizadas} — estado respetado (cambiado en el backoffice): ${r.estadoRespetado}`);
  console.log(`  Propietarios vinculados: ${r.propietarios} — clientes nuevos: ${r.clientesNuevos}`);
  console.log(`  Por estado: ${Object.entries(porEstado).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  if (r.errores.length) console.log(`  Filas con error (${r.errores.length}):\n   - ${r.errores.join("\n   - ")}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
