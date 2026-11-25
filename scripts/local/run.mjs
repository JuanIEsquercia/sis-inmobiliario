// Corre un comando con las variables de `.env.localdb` (entorno local).
// Uso: node scripts/local/run.mjs <comando> [args...]
//
// Se cargan en process.env antes de lanzar el comando, así tienen
// prioridad sobre `.env` (producción): Next.js, Prisma y dotenv nunca
// pisan una variable que ya está definida. No se usa `node --env-file`
// porque Next.js reenvía las opciones de Node a sus procesos hijos y
// Node rechaza esa opción por esa vía.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

if (!existsSync(".env.localdb")) {
  console.error("Falta .env.localdb. Correr primero: npm run local:start && npm run local:env");
  process.exit(1);
}
process.loadEnvFile(".env.localdb");

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error("Uso: node scripts/local/run.mjs <comando> [args...]");
  process.exit(1);
}

// node_modules/.bin al PATH, como hace `npm run`, para poder llamar a
// prisma/next/tsx directo también fuera de un script de npm.
const bin = path.resolve("node_modules", ".bin");
process.env.PATH = `${bin}${path.delimiter}${process.env.PATH ?? ""}`;

const quote = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
const child = spawn([cmd, ...args].map(quote).join(" "), { stdio: "inherit", shell: true, env: process.env });
child.on("exit", (code) => process.exit(code ?? 1));
