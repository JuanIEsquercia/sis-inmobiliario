export function formatPrice(listing: {
  priceAmount: unknown;
  priceCurrency: string | null;
  priceRaw: string | null;
}): string {
  if (listing.priceAmount === null || listing.priceAmount === undefined) {
    return listing.priceRaw ?? "Consultar precio";
  }
  const amount = Number(listing.priceAmount);
  if (!Number.isFinite(amount)) return listing.priceRaw ?? "Consultar precio";

  const currency = listing.priceCurrency ?? "";
  const formatted = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(amount);
  return currency ? `${currency} ${formatted}` : formatted;
}

export function formatArea(value: unknown, unit = "m²"): string | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${new Intl.NumberFormat("es-AR").format(n)} ${unit}`;
}

export function operationLabel(operationType: string): string {
  return operationType === "For Rent" ? "Alquiler" : "Venta";
}

export function formatDate(value: Date | string | null): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(d);
}

// Fecha Y hora, siempre en hora de Argentina.
//
// El timeZone va explícito a propósito: el servidor de producción corre
// en UTC, así que sin esto una sincronización de las 18:00 se mostraría
// como las 21:00 — justo el dato que esto viene a mostrar. Además lo
// hace determinístico entre servidor y navegador, que si no difieren y
// React avisa por hidratación.
export function formatDateTime(value: Date | string | null): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);
}
