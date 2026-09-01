import type { PaymentMethod } from "@/generated/prisma/client";

export function optionalStr(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : null;
}

export function requiredStr(v: FormDataEntryValue | null, fieldName: string): string {
  const s = optionalStr(v);
  if (s === null) throw new Error(`Falta "${fieldName}"`);
  return s;
}

export function optionalInt(v: FormDataEntryValue | null): number | null {
  const s = optionalStr(v);
  if (s === null) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export function optionalDecimal(v: FormDataEntryValue | null): string | null {
  const s = optionalStr(v);
  if (s === null) return null;
  return /^-?\d+(\.\d+)?$/.test(s) ? s : null;
}

export function requiredDecimal(v: FormDataEntryValue | null, fieldName: string): string {
  const s = optionalDecimal(v);
  if (s === null) throw new Error(`Falta o es inválido el campo "${fieldName}"`);
  return s;
}

export function requiredDate(v: FormDataEntryValue | null, fieldName: string): Date {
  const s = optionalStr(v);
  if (s === null) throw new Error(`Falta "${fieldName}"`);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error(`Fecha inválida en "${fieldName}"`);
  return d;
}

// Cada punto donde se confirma un cobro o un pago pide un medio
// (Efectivo/Transferencia) — un solo lugar para leer y validar el enum.
export function requiredMethod(v: FormDataEntryValue | null, fieldName = "Medio de pago"): PaymentMethod {
  const value = requiredStr(v, fieldName);
  if (value !== "EFECTIVO" && value !== "TRANSFERENCIA") throw new Error(`Medio de pago inválido ("${fieldName}")`);
  return value;
}
