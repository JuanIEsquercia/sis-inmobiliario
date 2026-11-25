// Respaldo del feed de Adinco: guarda el XML tal cual, con fecha, y
// opcionalmente TODAS las fotos originales de cada aviso (sin el tope de
// fotos por propiedad que se aplica en nuestro Storage).
//
// No toca ninguna base de datos: solo lee el feed (ADINCO_FEED_URL) y
// escribe archivos. Por eso puede correrse con el .env normal.
//
// Uso:
//   npm run respaldo                  -> solo el XML
//   npm run respaldo -- --fotos       -> XML + fotos originales
//   npm run respaldo -- --fotos --destino D:/respaldo-adinco
//
// Estructura:
//   <destino>/feed/AAAA-MM-DD_HHMM.xml
//   <destino>/fotos/<código o id>/<nn>.jpg   (nn = orden en el aviso)
// Las fotos ya descargadas se saltean, así se puede cortar y retomar.
import "dotenv/config";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseFeed } from "../src/lib/feed";

const CONCURRENCIA = 8;

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function sello(fecha: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}_${p(fecha.getHours())}${p(fecha.getMinutes())}`;
}

// Nombre de carpeta seguro a partir del código del aviso.
function carpeta(codigo: string | null, externalId: string): string {
  const base = codigo ? `cod-${codigo}` : `id-${externalId}`;
  return base.replace(/[^\w.-]+/g, "_");
}

async function main() {
  const feedUrl = process.env.ADINCO_FEED_URL;
  if (!feedUrl) throw new Error("Falta ADINCO_FEED_URL en .env");
  const destino = path.resolve(argumento("--destino") ?? "respaldos");
  const conFotos = process.argv.includes("--fotos");

  const res = await fetch(feedUrl);
  if (!res.ok) throw new Error(`No se pudo descargar el feed (HTTP ${res.status})`);
  const xml = await res.text();

  mkdirSync(path.join(destino, "feed"), { recursive: true });
  const archivoXml = path.join(destino, "feed", `${sello(new Date())}.xml`);
  writeFileSync(archivoXml, xml);

  const { listings, skipped } = parseFeed(xml);
  const totalFotos = listings.reduce((s, l) => s + l.images.length, 0);
  const anuncios = (xml.match(/<ad>/g) ?? []).length;
  console.log(`XML guardado: ${archivoXml}`);
  console.log(`  ${anuncios} <ad> en el XML, ${listings.length} leídos, ${skipped.length} con error, ${totalFotos} fotos.`);
  if (!conFotos) return;

  const tareas = listings.flatMap((l) =>
    l.images.map((img, i) => ({
      url: img.url,
      archivo: path.join(destino, "fotos", carpeta(l.code, l.externalId), `${String(i + 1).padStart(2, "0")}.jpg`),
    }))
  );

  let bajadas = 0, yaEstaban = 0, bytes = 0;
  const errores: string[] = [];
  const inicio = Date.now();
  for (let i = 0; i < tareas.length; i += CONCURRENCIA) {
    await Promise.all(
      tareas.slice(i, i + CONCURRENCIA).map(async (t) => {
        if (existsSync(t.archivo)) {
          yaEstaban++;
          return;
        }
        try {
          const r = await fetch(t.url);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const buf = Buffer.from(await r.arrayBuffer());
          mkdirSync(path.dirname(t.archivo), { recursive: true });
          writeFileSync(t.archivo, buf);
          bajadas++;
          bytes += buf.length;
        } catch (err) {
          errores.push(`${t.url}: ${err instanceof Error ? err.message : err}`);
        }
      })
    );
    const hechas = Math.min(i + CONCURRENCIA, tareas.length);
    if (hechas % 200 < CONCURRENCIA || hechas === tareas.length) console.log(`  fotos ${hechas}/${tareas.length}`);
  }

  console.log(
    `Fotos: ${bajadas} bajadas (${(bytes / 1024 / 1024).toFixed(0)} MB), ${yaEstaban} ya estaban, ` +
      `${errores.length} con error, en ${((Date.now() - inicio) / 1000).toFixed(0)} s.`
  );
  for (const e of errores.slice(0, 20)) console.log(`  - ${e}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
