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
