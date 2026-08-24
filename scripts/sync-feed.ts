import "dotenv/config";
import { runSync } from "../src/lib/sync";
import { prisma } from "../src/lib/prisma";

async function main() {
  const force = process.argv.includes("--force");
  const result = await runSync({
    force,
    onProgress: (done, total) => {
      if (done % 10 === 0 || done === total) console.log(`  ...${done}/${total}`);
    },
  });

  if (result.skippedUnchanged) {
    console.log("Feed sin cambios (Last-Modified/ETag iguales) — nada que sincronizar.");
    return;
  }

  console.log(
    `Sync completo en ${result.durationMs}ms — creados: ${result.created}, actualizados: ${result.updated}, dados de baja: ${result.delisted}`
  );

  if (result.parseErrors.length > 0) {
    console.warn(`${result.parseErrors.length} aviso(s) no se pudieron parsear:`);
    for (const err of result.parseErrors) {
      console.warn(`  - ad #${err.index}: ${err.reason}`);
    }
  }
}

main()
  .catch((err) => {
    console.error("Error en la sincronización:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
