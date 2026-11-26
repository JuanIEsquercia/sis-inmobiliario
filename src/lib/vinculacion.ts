// Vinculación del Historial (Unit: contratos, ventas, tasaciones cargados
// a mano) con las fichas de propiedad (Listing) por código. La dirección
// sirve para confirmar que el código no es un error de tipeo.
//
// Funciones puras: ver pruebas en scripts/tests.

const PALABRAS_VACIAS = new Set([
  "avenida", "av", "avda", "calle", "gobernador", "gdor", "gral", "general", "dr", "doctor", "pje", "pasaje",
  "de", "del", "la", "las", "los", "el", "y", "e", "esquina", "esq", "piso", "depto", "dpto", "edificio", "casa",
  "manzana", "mz", "lote", "barrio", "bo", "entre", "primer", "segundo", "tercer", "planta", "baja", "pb",
]);

function partes(direccion: string): { palabras: Set<string>; numero: string | null } {
  const limpio = direccion
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, " ");
  const tokens = limpio.split(/\s+/).filter(Boolean);
  const palabras = new Set(tokens.filter((t) => !/^\d/.test(t) && t.length > 2 && !PALABRAS_VACIAS.has(t)));
  const numero = tokens.find((t) => /^\d{2,5}$/.test(t)) ?? null;
  return { palabras, numero };
}

export type Coincidencia = "coincide" | "parecida" | "distinta";

// "coincide": misma calle y mismo número ("Gdor Gallino 285" y
//             "Gobernador Gallino 285 2°").
// "parecida": comparten la calle pero el número falta o difiere
//             ("lavalle 1202" y "Mendoza Esquina Lavalle").
// "distinta": no comparten ninguna palabra de la calle: revisar a mano.
export function compararDirecciones(a: string | null, b: string | null): Coincidencia {
  if (!a || !b) return "distinta";
  const pa = partes(a);
  const pb = partes(b);
  const comunes = [...pa.palabras].filter((p) => pb.palabras.has(p)).length;
  if (comunes === 0) return "distinta";
  if (pa.numero && pb.numero && pa.numero === pb.numero) return "coincide";
  return "parecida";
}
