// Normalización de nombres/apellidos (Client y Profile) — el problema
// real no era "mayúscula vs. minúscula" sino inconsistencia: cada
// agente tipea distinto (todo minúscula, todo mayúscula, mezclado), y
// eso se nota tanto en las tablas del backoffice como en cada
// documento impreso (liquidaciones, contratos, presupuestos, el
// comprobante de Central de Deudores) y en /equipo del sitio público.
// Capitalizado (Title Case), no MAYÚSCULA: en un documento formal un
// nombre en bloque lee "gritado"; capitalizado lee profesional — y la
// búsqueda ya es case-insensitive en todos lados, así que mayúscula no
// aporta nada ahí.

// Partículas que en español van en minúscula salvo que abran el nombre
// ("Pérez de la Cruz", no "Pérez De La Cruz").
const LOWERCASE_PARTICLES = new Set(["de", "del", "la", "las", "los", "y"]);

// Capitaliza un segmento ya en minúsculas, respetando guiones ("maria-
// jose" -> "Maria-Jose") y apóstrofos ("o'brien" -> "O'Brien").
function capitalizeSegment(segment: string): string {
  return segment
    .split("-")
    .map((part) =>
      part
        .split("'")
        .map((piece) => (piece.length > 0 ? piece[0].toUpperCase() + piece.slice(1) : piece))
        .join("'")
    )
    .join("-");
}

export function toTitleCase(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (cleaned.length === 0) return cleaned;

  return cleaned
    .split(" ")
    .map((word, i) => {
      // Client también guarda razones sociales, no solo personas (ej.
      // "Distribuidora Jota Be S.A.") — una palabra con punto es una
      // abreviatura (S.A., S.R.L., Ltda.) y forzar Title Case la rompe
      // ("S.A." -> "S.a."). Se pasa a mayúscula entera en vez de
      // recapitalizarla: convierte "s.a." y "S.A." al mismo resultado
      // correcto, sin depender de una lista fija de sociedades.
      if (word.includes(".")) return word.toUpperCase();
      const lower = word.toLowerCase();
      return i > 0 && LOWERCASE_PARTICLES.has(lower) ? lower : capitalizeSegment(lower);
    })
    .join(" ");
}

// Para campos opcionales (Profile.firstName/lastName pueden quedar sin
// cargar) — evita repetir el `? toTitleCase(x) : null` en cada action.
export function toTitleCaseOrNull(raw: string | null): string | null {
  return raw === null ? null : toTitleCase(raw);
}
