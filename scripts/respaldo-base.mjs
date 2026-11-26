// Respaldo completo de la base (pg_dump, formato custom) antes de una
// ventana de cambios. Solo LEE la base: no modifica nada.
//
// Uso:
//   npm run respaldo:base                     -> base de .env (producción)
//   npm run respaldo:base -- --env .env.localdb  -> base local (para probar)
//
// Deja el archivo en respaldos/base/<host>-AAAA-MM-DD_HHMM.dump. Para
// restaurar (solo si algo salió mal), ver docs/ventana-produccion.md.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

const i = process.argv.indexOf("--env");
const envFile = i >= 0 ? process.argv[i + 1] : ".env";
process.loadEnvFile(envFile);

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error(`Falta DIRECT_URL en ${envFile}`);
const host = new URL(url).hostname;

// pg_dump: el del PATH o el de la instalación de PostgreSQL en Windows.
const candidatos = ["pg_dump", "C:/Program Files/PostgreSQL/17/bin/pg_dump.exe", "C:/Program Files/PostgreSQL/16/bin/pg_dump.exe"];
const pgDump = candidatos.find((c) => c === "pg_dump" ? hayEnPath("pg_dump") : existsSync(c));
if (!pgDump) throw new Error("No encontré pg_dump. Instalá PostgreSQL 17 (solo las herramientas de cliente).");

function hayEnPath(cmd) {
  try {
    execFileSync(cmd, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const p = (n) => String(n).padStart(2, "0");
const d = new Date();
const sello = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
mkdirSync(path.join("respaldos", "base"), { recursive: true });
const archivo = path.join("respaldos", "base", `${host.split(".")[0]}-${sello}.dump`);

console.log(`Respaldando ${host} en ${archivo} ...`);
// Solo el esquema public (los datos del sistema). auth y storage de
// Supabase los administra Supabase y tienen su propio respaldo.
execFileSync(pgDump, ["--format=custom", "--no-owner", "--no-privileges", "--schema=public", `--file=${archivo}`, url], {
  stdio: "inherit",
});
console.log(`Listo: ${(statSync(archivo).size / 1024 / 1024).toFixed(1)} MB`);
