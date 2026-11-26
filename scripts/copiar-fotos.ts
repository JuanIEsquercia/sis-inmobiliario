// Copia las fotos de las propiedades desde Adinco a nuestro Storage
// (bucket "propiedades"), con el tope por propiedad, recorte de bordes y
// WebP. Idempotente: las fotos ya copiadas se saltean, así que se puede
// cortar y volver a correr. Al final informa cuánto subió y cuánto tardó.
//
// Base y Storage salen del mismo archivo de variables. Contra la base
// local corre directo; contra producción pide --confirmar=<host> (ver
// scripts/destino.ts).
//
// Uso:
//   local:       npm run local:copiar-fotos
//   producción:  npm run copiar-fotos -- --confirmar=<host>
import "dotenv/config";
import { confirmarDestino } from "./destino";

confirmarDestino();

const CONCURRENCIA = 4; // propiedades en paralelo

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { asegurarBucketPropiedades, copiarFotosDeListing } = await import("../src/lib/property-image-copy");
  type Resultado = Awaited<ReturnType<typeof copiarFotosDeListing>>;

  const admin = createAdminClient();
  await asegurarBucketPropiedades(admin);

  const listings = await prisma.listing.findMany({ select: { id: true, code: true }, orderBy: { id: "asc" } });
  const total: Resultado = { copiadas: 0, yaEstaban: 0, recortadas: 0, bytesSubidos: 0, errores: [] };
  const inicio = Date.now();

  for (let i = 0; i < listings.length; i += CONCURRENCIA) {
    const tanda = listings.slice(i, i + CONCURRENCIA);
    const resultados = await Promise.all(tanda.map((l) => copiarFotosDeListing(l.id, admin)));
    for (const r of resultados) {
      total.copiadas += r.copiadas;
      total.yaEstaban += r.yaEstaban;
      total.recortadas += r.recortadas;
      total.bytesSubidos += r.bytesSubidos;
      total.errores.push(...r.errores);
    }
    const hechas = Math.min(i + CONCURRENCIA, listings.length);
    if (hechas % 20 < CONCURRENCIA || hechas === listings.length) {
      console.log(`  propiedades ${hechas}/${listings.length} — fotos copiadas ${total.copiadas}`);
    }
  }

  const segundos = (Date.now() - inicio) / 1000;
  const mb = total.bytesSubidos / 1024 / 1024;
  console.log(`\nListo en ${segundos.toFixed(0)} s.`);
  console.log(`  Fotos copiadas: ${total.copiadas} (${total.recortadas} con bordes recortados), ya estaban: ${total.yaEstaban}, con error: ${total.errores.length}`);
  if (total.copiadas > 0) {
    console.log(`  Subido: ${mb.toFixed(1)} MB — ${(total.bytesSubidos / total.copiadas / 1024).toFixed(0)} KB por foto (todas sus versiones)`);
  }
  for (const e of total.errores.slice(0, 20)) console.log(`  - ${e.url}: ${e.motivo}`);

  const [conCopia, sinCopiaDentroDelTope] = await Promise.all([
    prisma.listingImage.count({ where: { storagePath: { not: null } } }),
    prisma.listing.count({ where: { images: { some: {} }, NOT: { images: { some: { storagePath: { not: null } } } } } }),
  ]);
  console.log(`  En la base: ${conCopia} fotos con copia propia; propiedades con fotos pero sin ninguna copia: ${sinCopiaDentroDelTope}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
