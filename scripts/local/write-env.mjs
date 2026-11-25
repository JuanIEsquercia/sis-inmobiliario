// Genera `.env.localdb` a partir del Supabase local que está corriendo
// (`npm run local:start`). Ese archivo es el que usan todos los comandos
// `npm run local:*`; `.env` (producción) no se toca.
//
// Copia de `.env` solo ADINCO_FEED_URL: leer el feed es de solo lectura,
// y sirve para importar a la base local.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const raw = execSync("npx supabase status -o env", { encoding: "utf8" });
const status = Object.fromEntries(
  raw
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]])
);

const apiUrl = status.API_URL;
const dbUrl = status.DB_URL;
const publishable = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const secret = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
if (!apiUrl || !dbUrl || !publishable || !secret) {
  console.error("No se pudo leer el estado de Supabase local. ¿Está corriendo? (npm run local:start)");
  process.exit(1);
}

let feedUrl = "";
if (existsSync(".env")) {
  const m = readFileSync(".env", "utf8").match(/^ADINCO_FEED_URL=(.*)$/m);
  if (m) feedUrl = m[1].trim();
}

const content = `# Entorno LOCAL (Supabase en Docker). Generado por scripts/local/write-env.mjs.
# Lo usan los comandos npm run local:*. Nunca apunta a producción.
DATABASE_URL="${dbUrl}"
DIRECT_URL="${dbUrl}"
NEXT_PUBLIC_SUPABASE_URL="${apiUrl}"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${publishable}"
SUPABASE_SERVICE_ROLE_KEY="${secret}"
SYNC_SECRET="local-sync-secret"
ADINCO_FEED_URL=${feedUrl || '""'}
`;

writeFileSync(".env.localdb", content);
console.log("Listo: .env.localdb apunta a", apiUrl, "y a la base local.");
