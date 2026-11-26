// Reglas de las visitas: turnos, hora de Argentina y qué paso se puede
// dar desde cada estado. Funciones puras (sin base de datos), así se
// pueden probar solas y usarse tanto en el servidor como en pantalla.

// --- Turnos -----------------------------------------------------------------

// Lista fija: 07:00 a 21:30 cada media hora; la última visita termina a
// las 22:00. Todos los días, fines de semana incluidos.
export const TURNOS: string[] = (() => {
  const t: string[] = [];
  for (let h = 7; h <= 21; h++) {
    for (const m of ["00", "30"]) t.push(`${String(h).padStart(2, "0")}:${m}`);
  }
  return t;
})();

export const DURACION_VISITA_MIN = 30;

export function esTurnoValido(slot: string): boolean {
  return TURNOS.includes(slot);
}

export function finDeTurno(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const total = h * 60 + m + DURACION_VISITA_MIN;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// --- Hora de Argentina -------------------------------------------------------

// Argentina no tiene horario de verano desde 2009: siempre UTC-3. Se
// fija explícito porque el servidor de producción corre en UTC.
const OFFSET_AR = "-03:00";
const ZONA_AR = "America/Argentina/Buenos_Aires";

// "AAAA-MM-DD" de hoy (o de la fecha dada) en Argentina.
export function diaArgentina(fecha: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_AR, year: "numeric", month: "2-digit", day: "2-digit" }).format(fecha);
}

// "HH:MM" de ahora en Argentina.
export function horaArgentina(fecha: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: ZONA_AR, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(fecha);
}

// Instante (UTC) en que empieza el turno de ese día en Argentina.
export function inicioDelTurno(dia: string, slot: string): Date {
  return new Date(`${dia}T${slot}:00${OFFSET_AR}`);
}

// El día como se guarda en la columna DATE (medianoche UTC de ese día).
export function diaComoFecha(dia: string): Date {
  return new Date(`${dia}T00:00:00Z`);
}

export function esDiaValido(dia: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  const d = diaComoFecha(dia);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dia;
}

// --- Circuito de estados -----------------------------------------------------

export type EstadoVisita = "PEDIDA" | "RETIRADA" | "COORDINADA" | "REALIZADA" | "DEVUELTA" | "CANCELADA";
export type UbicacionLlave = "INMOBILIARIA" | "CONTACTO";
export type AccionVisita = "retirar" | "coordinar" | "realizar" | "devolver" | "confirmarDevolucion" | "cancelar";

export interface VisitaParaReglas {
  status: EstadoVisita;
  keyLocation: UbicacionLlave;
  devueltaAt: Date | null;
  returnConfirmedAt: Date | null;
}

// Quién da cada paso: el vendedor de la visita o quien gestiona las
// llaves en la inmobiliaria. Quien gestiona llaves puede, además, dar
// cualquier paso del vendedor (para cubrir a alguien o corregir).
export const QUIEN: Record<AccionVisita, "vendedor" | "gestor"> = {
  retirar: "gestor", // entrega la llave al vendedor
  coordinar: "vendedor", // el contacto confirmó
  realizar: "vendedor",
  devolver: "vendedor",
  confirmarDevolucion: "gestor", // la recibe en la inmobiliaria
  cancelar: "vendedor",
};

// Pasos posibles desde el estado actual, según dónde estaba la llave.
//
// Inmobiliaria: Pedida -> Retirada -> Realizada -> Devuelta (+ confirmación).
// Contacto:     Pedida -> Coordinada -> Realizada.
// Cancelar: desde cualquier paso abierto. Si la llave ya estaba retirada,
// cancelar implica devolverla: queda pendiente de confirmación igual que
// una devolución normal.
export function accionesPosibles(v: VisitaParaReglas): AccionVisita[] {
  const a: AccionVisita[] = [];
  const inmo = v.keyLocation === "INMOBILIARIA";
  switch (v.status) {
    case "PEDIDA":
      a.push(inmo ? "retirar" : "coordinar", "cancelar");
      break;
    case "COORDINADA":
      a.push("realizar", "cancelar");
      break;
    case "RETIRADA":
      a.push("realizar", "cancelar");
      break;
    case "REALIZADA":
      if (inmo && !v.devueltaAt) a.push("devolver");
      break;
  }
  if (inmo && v.devueltaAt && !v.returnConfirmedAt) a.push("confirmarDevolucion");
  return a;
}

export function puede(v: VisitaParaReglas, accion: AccionVisita): boolean {
  return accionesPosibles(v).includes(accion);
}

// Llave de la inmobiliaria que está afuera: se retiró y todavía no se
// devolvió (aunque la visita ya se haya hecho).
export function llaveAfuera(v: VisitaParaReglas & { retiradaAt: Date | null }): boolean {
  return v.keyLocation === "INMOBILIARIA" && v.retiradaAt !== null && v.devueltaAt === null;
}

// --- Textos -----------------------------------------------------------------

export const ESTADO_VISITA_LABEL: Record<EstadoVisita, string> = {
  PEDIDA: "Pedida",
  RETIRADA: "Llave retirada",
  COORDINADA: "Coordinada",
  REALIZADA: "Visita hecha",
  DEVUELTA: "Llave devuelta",
  CANCELADA: "Cancelada",
};

export const EVENTO_LABEL: Record<string, string> = {
  PEDIDA: "Llave pedida",
  RETIRADA: "Llave retirada",
  COORDINADA: "Coordinada con el contacto",
  REALIZADA: "Visita hecha",
  DEVUELTA: "Llave devuelta",
  DEVOLUCION_CONFIRMADA: "Devolución confirmada",
  CANCELADA: "Cancelada",
};

export const ACCION_LABEL: Record<AccionVisita, string> = {
  retirar: "Entregar llave (retirada)",
  coordinar: "El contacto confirmó",
  realizar: "Marcar visita hecha",
  devolver: "Devolví la llave",
  confirmarDevolucion: "Confirmar que la llave volvió",
  cancelar: "Cancelar visita",
};

// Mensaje de WhatsApp al contacto que tiene la llave.
export function mensajeContactoLlave(p: {
  contacto: string;
  propiedad: string;
  codigo: string | null;
  dia: string;
  slot: string;
  vendedor: string;
}): string {
  const [a, m, d] = p.dia.split("-");
  return (
    `Hola ${p.contacto}, te escribe ${p.vendedor} de García Propiedades. ` +
    `¿Podemos visitar ${p.propiedad}${p.codigo ? ` (código ${p.codigo})` : ""} ` +
    `el ${d}/${m}/${a} de ${p.slot} a ${finDeTurno(p.slot)}? ¡Gracias!`
  );
}
