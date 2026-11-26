// Vincula en lote el Historial con las fichas: las de dirección igual o
// parecida (la unidad toma la dirección de la ficha y la anterior queda en
// sus notas). Las de dirección distinta no se tocan: se resuelven una por
// una desde /backoffice/historial/vincular. Es lo mismo que el botón de
// esa pantalla.
//
// Contra la base local corre directo; contra producción pide
// --confirmar=<host> (ver scripts/destino.ts).
// Uso: npm run vincular-historial [-- --confirmar=<host>]
import "dotenv/config";
import { confirmarDestino } from "./destino";

confirmarDestino();

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { vincularCoincidentesEnLote } = await import("../src/lib/vinculacion-historial");
  const r = await vincularCoincidentesEnLote();
  console.log(`Vinculadas: ${r.vinculadas} — conflictos: ${r.conflictos} — de dirección distinta, para revisar a mano: ${r.pendientes}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
