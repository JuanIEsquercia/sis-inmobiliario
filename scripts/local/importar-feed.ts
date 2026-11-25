// Importa a la base LOCAL un XML guardado por `npm run respaldo` (o el
// feed en vivo si no se pasa archivo). Usa el mismo runSync que
// producción. Solo corre contra el entorno local: ver guard.ts.
//
// Uso: npm run local:importar -- respaldos/feed/2026-11-25_1830.xml
import { readFileSync } from "node:fs";
import { assertLocalEnvironment } from "./guard";

assertLocalEnvironment();

async function main() {
  const { runSync } = await import("../../src/lib/sync");
  const { prisma } = await import("../../src/lib/prisma");

  const archivo = process.argv[2];
  const xml = archivo ? readFileSync(archivo, "utf8") : undefined;
  console.log(archivo ? `Importando ${archivo}` : "Importando el feed en vivo");

  const r = await runSync({
    xml,
    force: true,
    onProgress: (done, total) => {
      if (done % 25 === 0 || done === total) console.log(`  ...${done}/${total}`);
    },
  });
  console.log(
    `Listo en ${(r.durationMs / 1000).toFixed(1)} s: creadas ${r.created}, actualizadas ${r.updated}, ` +
      `sin cambios ${r.unchanged}, dadas de baja ${r.delisted}, errores de lectura ${r.parseErrors.length}.`
  );
  const [total, activas, fotos] = await Promise.all([
    prisma.listing.count(),
    prisma.listing.count({ where: { isActive: true } }),
    prisma.listingImage.count(),
  ]);
  console.log(`Base local: ${total} propiedades (${activas} activas), ${fotos} fotos registradas.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
