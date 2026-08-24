// Genera src/lib/preview-data.json a partir del feed real, para poder ver
// el sitio renderizado sin depender todavía de una base de datos.
// Uso temporal: se borra (junto con listings.preview.ts) en cuanto Supabase
// esté conectado y el sync real reemplace esta fuente de datos.
import "dotenv/config";
import { writeFileSync } from "fs";
import { parseFeed } from "../src/lib/feed";

async function main() {
  const feedUrl = process.env.ADINCO_FEED_URL;
  if (!feedUrl) throw new Error("Falta la variable de entorno ADINCO_FEED_URL");

  const res = await fetch(feedUrl);
  if (!res.ok) throw new Error(`No se pudo descargar el feed (HTTP ${res.status})`);
  const xml = await res.text();

  const { listings, skipped } = parseFeed(xml);
  if (skipped.length > 0) {
    console.warn(`${skipped.length} aviso(s) no se pudieron parsear:`, skipped);
  }

  const withId = listings.map((listing, index) => {
    const { rawData, ...rest } = listing;
    void rawData;
    return { id: index + 1, ...rest };
  });

  writeFileSync("src/lib/preview-data.json", JSON.stringify(withId, null, 2), "utf-8");
  console.log(`Escritos ${withId.length} avisos en src/lib/preview-data.json`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
