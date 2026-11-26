// Lectura de la planilla "UNIFICADO" exportada del panel de Adinco: una
// fila por aviso, con estado, datos básicos y propietario. Sirve para
// traer las propiedades que no vienen en el XML (alquiladas, vendidas,
// suspendidas, incompletas) y el estado real de todas.
//
// Funciones puras (sin base de datos): ver pruebas en scripts/tests.

import type { ListingStatus } from "@/generated/prisma/client";

export const COLUMNAS_PLANILLA = [
  "Id Aviso", "Creado", "Slug", "Estado", "Dirección", "Ubicación", "Usuario asignado", "Tipo de propiedad",
  "Superficie total", "Superficie cubierta", "Fondo libre", "Antiguedad", "Dormitorios", "Baños",
  "Cocheras descubiertas", "Cocheras cubiertas", "Cocheras semicubiertas", "Plantas", "Expensas", "Precio",
  "Nombre de propietario", "Email de propietario", "Celular de propietario", "Argenprop",
] as const;

// Estado de Adinco -> estado comercial nuestro. "Incompleta" y "Borrador"
// son avisos sin terminar: quedan suspendidos hasta que alguien los revise
// (decisión del 2026-11-26). Un alquilado incompleto sigue alquilado.
const ESTADOS: Record<string, ListingStatus> = {
  "vigente": "DISPONIBLE",
  "vigente incompleta": "SUSPENDIDA",
  "alquilado": "ALQUILADA",
  "alquilado incompleta": "ALQUILADA",
  "vendido": "VENDIDA",
  "suspendido": "SUSPENDIDA",
  "reservado": "RESERVADA",
  "borrador": "SUSPENDIDA",
};

export function estadoDesdeAdinco(estado: string): ListingStatus | null {
  return ESTADOS[estado.trim().toLowerCase()] ?? null;
}

const vacio = (v: string | undefined) => !v || v.trim() === "" || v.trim() === "-";
const txt = (v: string | undefined) => (vacio(v) ? null : v!.trim());

// Primer número del texto, en formato argentino: "U$D 1.300.000" ->
// 1300000, "35 m2" -> 35 (sin tomar el "2" de "m2"), "12,5 ha" -> 12.5.
function numeroAR(v: string): number | null {
  const m = v.match(/\d[\d.]*(,\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// "$ 650.000" -> ARS 650000; "U$D 75.000" -> USD 75000. "Consultar precio"
// y los montos de relleno ("$ 1", "$ 0") quedan sin precio.
export function precioDesdeAdinco(v: string | undefined): { amount: number; currency: "ARS" | "USD" } | null {
  if (vacio(v)) return null;
  const s = v!.trim();
  const currency = /^u\$d/i.test(s) ? "USD" : s.startsWith("$") ? "ARS" : null;
  if (!currency) return null;
  const amount = numeroAR(s);
  if (amount === null || amount <= 1) return null;
  return { amount, currency };
}

export function montoARS(v: string | undefined): number | null {
  if (vacio(v)) return null;
  const n = numeroAR(v!);
  return n !== null && n > 1 ? n : null;
}

// "35 m2" -> 35; "2 ha" -> 20000 (m²).
export function superficie(v: string | undefined): number | null {
  if (vacio(v)) return null;
  const n = numeroAR(v!);
  if (n === null || n <= 0) return null;
  return /ha\b/i.test(v!) ? n * 10000 : n;
}

// "3" -> 3; "+ 5" -> 5; "Monoamb." -> 0.
export function entero(v: string | undefined): number | null {
  if (vacio(v)) return null;
  if (/monoamb/i.test(v!)) return 0;
  const m = v!.match(/\d+/);
  return m ? Number(m[0]) : null;
}

// "Corrientes, Corrientes, Corrientes" -> barrio, localidad, provincia;
// "San Luis del Palmar, Corrientes" -> localidad, provincia.
export function ubicacion(v: string | undefined): { neighborhood: string | null; city: string | null; region: string | null } {
  const partes = (v ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  if (partes.length >= 3) return { neighborhood: partes[0], city: partes[partes.length - 2], region: partes[partes.length - 1] };
  if (partes.length === 2) return { neighborhood: null, city: partes[0], region: partes[1] };
  return { neighborhood: null, city: partes[0] ?? null, region: null };
}

// Emails que no son del propietario: los de la propia inmobiliaria o de
// relleno, cargados para que Adinco aceptara el formulario.
const EMAILS_NO_PROPIETARIO = [/garcia.*propiedades/i, /^nomail@/i, /^sin.?mail/i];

export interface PropietarioPlanilla {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

export function propietario(nombre: string | undefined, email: string | undefined, celular: string | undefined): PropietarioPlanilla | null {
  const n = txt(nombre)?.replace(/\s+/g, " ");
  if (!n) return null;
  const [firstName, ...resto] = n.split(" ");
  const e = txt(email);
  return {
    firstName,
    lastName: resto.join(" ") || "-",
    email: e && !EMAILS_NO_PROPIETARIO.some((r) => r.test(e)) ? e.toLowerCase() : null,
    phone: txt(celular)?.replace(/[^\d+]/g, "") || null,
  };
}

export interface FilaPlanilla {
  externalId: string;
  code: string;
  estadoAdinco: string;
  status: ListingStatus;
  // Venta/alquiler: sale del estado (vendido/alquilado). En el resto no
  // figura y se deduce por la moneda (USD = venta); se marca como deducida.
  operationType: "For Sale" | "For Rent";
  operacionDeducida: boolean;
  creado: Date | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  region: string | null;
  responsable: string | null;
  propertyType: string;
  plotArea: number | null;
  floorArea: number | null;
  backyardArea: number | null;
  ageYears: number | null;
  rooms: number | null;
  bathrooms: number | null;
  openGarages: number | null;
  coveredGarages: number | null;
  semiCoveredGarages: number | null;
  floorsCount: number | null;
  expenses: number | null;
  price: { amount: number; currency: "ARS" | "USD" } | null;
  propietario: PropietarioPlanilla | null;
  original: Record<string, string>;
}

export function leerFila(celdas: string[]): FilaPlanilla | { error: string } {
  const original = Object.fromEntries(COLUMNAS_PLANILLA.map((c, i) => [c, celdas[i] ?? ""]));
  const externalId = txt(celdas[0]);
  const code = (celdas[2] ?? "").match(/(\d+)\s*$/)?.[1];
  const estadoAdinco = (celdas[3] ?? "").trim();
  const status = estadoDesdeAdinco(estadoAdinco);
  if (!externalId) return { error: "sin Id Aviso" };
  if (!code) return { error: `${externalId}: slug sin código (${celdas[2]})` };
  if (!status) return { error: `${externalId}: estado desconocido "${estadoAdinco}"` };

  const price = precioDesdeAdinco(celdas[19]);
  const e = estadoAdinco.toLowerCase();
  const porEstado = e.startsWith("alquilado") ? "For Rent" : e.startsWith("vendido") ? "For Sale" : null;
  const operationType = porEstado ?? (price?.currency === "ARS" ? "For Rent" : "For Sale");

  const creado = txt(celdas[1]) ? new Date(`${celdas[1].trim().replace(" ", "T")}-03:00`) : null;

  return {
    externalId,
    code: String(Number(code)),
    estadoAdinco,
    status,
    operationType,
    operacionDeducida: porEstado === null,
    creado: creado && !Number.isNaN(creado.getTime()) ? creado : null,
    address: txt(celdas[4]),
    ...ubicacion(celdas[5]),
    responsable: txt(celdas[6])?.replace(/\s+/g, " ") ?? null,
    propertyType: txt(celdas[7]) ?? "Sin tipo",
    plotArea: superficie(celdas[8]),
    floorArea: superficie(celdas[9]),
    backyardArea: superficie(celdas[10]),
    ageYears: entero(celdas[11]),
    rooms: entero(celdas[12]),
    bathrooms: entero(celdas[13]),
    openGarages: entero(celdas[14]),
    coveredGarages: entero(celdas[15]),
    semiCoveredGarages: entero(celdas[16]),
    floorsCount: entero(celdas[17]),
    expenses: montoARS(celdas[18]),
    price,
    propietario: propietario(celdas[20], celdas[21], celdas[22]),
    original,
  };
}
