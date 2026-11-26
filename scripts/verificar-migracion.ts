// Resumen de SOLO LECTURA del estado de la migración de Adinco en una
// base: fichas por origen, estado y publicación; Historial vinculado;
// propietarios; visitas. Sirve para comparar antes y después de la
// ventana en producción.
//
// Uso: npm run verificar:migracion            (base de .env)
//      npm run local:verificar:migracion      (base local)
import "dotenv/config";

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const host = new URL(process.env.DATABASE_URL!).hostname;

  const [porEstado, porOrigen, publicadas, sinCodigo, unidades, vinculadas, garc, conPropietario, conLlave, visitas, sync] =
    await Promise.all([
      prisma.listing.groupBy({ by: ["status"], _count: true }),
      prisma.listing.groupBy({ by: ["origin"], _count: true }),
      prisma.listing.count({ where: { isActive: true } }),
      prisma.listing.count({ where: { code: null } }),
      prisma.unit.count(),
      prisma.unit.count({ where: { listingId: { not: null } } }),
      prisma.unit.count({ where: { propertyCode: { startsWith: "GARC", mode: "insensitive" } } }),
      prisma.listing.count({ where: { ownerClientId: { not: null } } }),
      prisma.listing.count({ where: { keyLocation: { not: null } } }),
      prisma.visit.count(),
      prisma.syncState.findUnique({ where: { id: 1 } }),
    ]);

  const fmt = (rows: { _count: number }[], key: string) =>
    rows.map((r) => `${(r as unknown as Record<string, string>)[key]} ${r._count}`).join(", ");

  console.log(`Base: ${host}`);
  console.log(`Fichas: ${porEstado.reduce((s, r) => s + r._count, 0)} — publicadas en el sitio: ${publicadas} — sin código: ${sinCodigo}`);
  console.log(`  por estado: ${fmt(porEstado, "status")}`);
  console.log(`  por origen: ${fmt(porOrigen, "origin")}`);
  console.log(`  con propietario: ${conPropietario} — con llave indicada: ${conLlave}`);
  console.log(`Historial: ${unidades} propiedades — vinculadas a una ficha: ${vinculadas} — con código "GARC1-" sin normalizar: ${garc}`);
  console.log(`Visitas: ${visitas}`);
  console.log(`Último sync: ${sync?.lastSyncedAt?.toISOString() ?? "nunca"}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
