// Freno de seguridad para los scripts del entorno local (scripts/local/*).
//
// Hay una sola base real (producción) y su conexión está en `.env`. Los
// scripts de esta carpeta escriben datos (usuarios de prueba, importación
// de propiedades, fotos), así que antes de hacer nada verifican que tanto
// la base como Supabase apunten a esta PC. Si alguien los corre sin
// `.env.localdb` cargado, cortan acá y no tocan producción.

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

function hostOf(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Falta ${name}. ¿Corriste el script con .env.localdb?`);
  try {
    return new URL(value).hostname;
  } catch {
    throw new Error(`${name} no es una URL válida`);
  }
}

export function assertLocalEnvironment(): void {
  const checks: [string, string | undefined][] = [
    ["DATABASE_URL", process.env.DATABASE_URL],
    ["DIRECT_URL", process.env.DIRECT_URL],
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
  ];
  for (const [name, value] of checks) {
    const host = hostOf(value, name);
    if (!LOCAL_HOSTS.has(host)) {
      throw new Error(
        `${name} apunta a "${host}", no a esta PC. Este script solo corre contra el entorno local ` +
          `(ver docs/entorno-local.md). No se ejecutó nada.`
      );
    }
  }
}
