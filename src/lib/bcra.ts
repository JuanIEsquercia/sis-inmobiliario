// Cliente de la API pública "Central de Deudores" del BCRA — sin
// autenticación ni API key (confirmado contra el manual oficial:
// https://www.bcra.gob.ar/archivos/Catalogo/Content/files/pdf/central-deudores-v1.pdf).
// A propósito server-only (nunca se importa desde un componente
// cliente): el manual aclara que el BCRA aplica control de tráfico por
// IP, así que todo pasa por el backend, nunca por el navegador del
// agente.
//
// 404 es el resultado NORMAL de "esta persona no tiene antecedentes" —
// se modela como found:false, no como excepción. Cualquier otro código
// (400/500/timeout/red) sí se propaga como Error real.

const BASE_URL = "https://api.bcra.gob.ar/CentralDeDeudores/v1.0";

interface BcraErrorBody {
  status: number;
  errorMessages?: string[];
}

type BcraResult<T> = { found: true; data: T } | { found: false };

async function bcraGet<T>(path: string): Promise<BcraResult<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { signal: controller.signal, cache: "no-store" });
  } catch (err) {
    throw new Error(
      `No se pudo contactar a la API del BCRA (${err instanceof Error ? err.message : "error de red"}).`
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 404) return { found: false };

  const body = (await res.json().catch(() => null)) as (BcraErrorBody & { results?: T }) | null;

  if (!res.ok) {
    const message = body?.errorMessages?.join(" ") ?? `La API del BCRA respondió con error ${res.status}.`;
    throw new Error(message);
  }
  if (!body?.results) {
    throw new Error("La API del BCRA devolvió una respuesta inesperada.");
  }

  return { found: true, data: body.results };
}

export interface DeudaEntidad {
  entidad: string;
  situacion: number;
  fechaSit1?: string;
  monto: number;
  diasAtrasoPago?: number;
  refinanciaciones?: boolean;
  recategorizacionOblig?: boolean;
  situacionJuridica?: boolean;
  irrecDisposicionTecnica?: boolean;
  enRevision: boolean;
  procesoJud: boolean;
}

export interface DeudaPeriodo {
  periodo: string; // AAAAMM
  entidades: DeudaEntidad[];
}

export interface DeudaResult {
  identificacion: number;
  denominacion: string;
  periodos: DeudaPeriodo[];
}

export interface ChequeDetalle {
  nroCheque: number;
  fechaRechazo: string;
  monto: number;
  fechaPago: string | null;
  fechaPagoMulta: string | null;
  estadoMulta: string | null;
  ctaPersonal: boolean;
  denomJuridica: string | null;
  enRevision: boolean;
  procesoJud: boolean;
}

export interface ChequesEntidad {
  entidad: number;
  detalle: ChequeDetalle[];
}

export interface ChequesCausal {
  causal: string;
  entidades: ChequesEntidad[];
}

export interface ChequesResult {
  identificacion: number;
  denominacion: string;
  causales: ChequesCausal[];
}

// Situación actual (último período informado) — un CUIT puede figurar
// sin deuda comercial pero sí con historial o cheques, por eso las 3
// consultas van siempre las 3, no en cascada.
export function consultarDeudas(cuit: string) {
  return bcraGet<DeudaResult>(`/Deudas/${cuit}`);
}

// Últimos 24 meses.
export function consultarHistoricas(cuit: string) {
  return bcraGet<DeudaResult>(`/Deudas/Historicas/${cuit}`);
}

export function consultarChequesRechazados(cuit: string) {
  return bcraGet<ChequesResult>(`/Deudas/ChequesRechazados/${cuit}`);
}

// El único requisito que exige la propia API (ver Response Bad Request
// del manual): 11 dígitos exactos. No se valida dígito verificador acá
// a propósito — si el CUIT está mal tipeado pero tiene 11 dígitos, la
// API igual va a responder 404 "no encontrado" o, en el peor caso,
// traer el informe de otra persona con ese número — por eso el
// resultado siempre muestra la `denominacion` que devuelve el BCRA,
// para que el agente la compare contra el nombre del postulante.
export function normalizeCuit(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidCuit(cuit: string): boolean {
  return /^\d{11}$/.test(cuit);
}

// Situación 1-5 según el Texto ordenado de Clasificación de deudores
// que cita el propio manual — resumido para mostrar como badge.
export const SITUACION_LABELS: Record<number, string> = {
  1: "Situación normal",
  2: "Con seguimiento especial / riesgo bajo",
  3: "Con problemas / riesgo medio",
  4: "Alto riesgo de insolvencia / riesgo alto",
  5: "Irrecuperable",
};

export function situacionColorClass(situacion: number | null): string {
  if (situacion === null) return "bg-surface text-muted border-border";
  if (situacion <= 1) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (situacion === 2) return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
  if (situacion === 3) return "bg-orange-500/10 text-orange-700 border-orange-500/20";
  return "bg-red-500/10 text-red-600 border-red-500/20";
}
