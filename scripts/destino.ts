// Freno para los scripts que ESCRIBEN datos y pueden correr tanto en local
// como en producción (importar la planilla, etc.).
//
// - Contra la base local (127.0.0.1 / localhost): corre directo.
// - Contra cualquier otra base: solo si se pasa --confirmar=<host> con el
//   host exacto de la base. Así nadie escribe en producción por correr el
//   comando equivocado, y el host queda escrito en el comando.

const LOCALES = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export function confirmarDestino(): { host: string; esLocal: boolean } {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL.");
  const host = new URL(url).hostname;
  if (LOCALES.has(host)) return { host, esLocal: true };

  const flag = process.argv.find((a) => a.startsWith("--confirmar="));
  const confirmado = flag?.slice("--confirmar=".length);
  if (confirmado !== host) {
    throw new Error(
      `Este comando va a ESCRIBIR en la base de ${host}, que no es la local.\n` +
        `Si es lo que querés, volvé a correrlo agregando: --confirmar=${host}\n` +
        `No se ejecutó nada.`
    );
  }
  console.log(`⚠ Escribiendo en ${host} (confirmado).`);
  return { host, esLocal: false };
}
