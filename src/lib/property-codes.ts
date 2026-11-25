// Códigos de propiedad: la numeración correlativa de la inmobiliaria
// (la misma que asigna Adinco), compartida entre las fichas (Listing.code)
// y las propiedades del Historial (Unit.propertyCode).
//
// Funciones puras: no tocan la base, así se pueden probar solas.

// Forma canónica de un código: solo el número final, sin ceros a la
// izquierda. El panel de Adinco muestra el código como "GARC1-359" y así
// quedó cargado en algunas propiedades del Historial; el feed lo manda
// como "359". Las dos formas son la misma propiedad.
//
//   "359"        -> "359"
//   "GARC1-359"  -> "359"
//   "garc1-0359" -> "359"
//   " 42 "       -> "42"
//   "sin código" -> null
export function normalizarCodigo(codigo: string | null | undefined): string | null {
  if (!codigo) return null;
  const m = codigo.trim().match(/(\d+)\s*$/);
  if (!m) return null;
  return String(Number.parseInt(m[1], 10));
}

// Códigos de relleno que no cuentan para la numeración: hubo cargas con
// "0" o "1" cuando no se sabía el código real.
const CODIGOS_DE_RELLENO = new Set(["0", "1"]);

// Número más alto entre todos los códigos dados (de fichas y de unidades),
// ignorando los de relleno y los que no tienen número.
export function codigoMaximo(codigos: (string | null | undefined)[]): number {
  let max = 0;
  for (const c of codigos) {
    const n = normalizarCodigo(c);
    if (n === null || CODIGOS_DE_RELLENO.has(n)) continue;
    max = Math.max(max, Number(n));
  }
  return max;
}
