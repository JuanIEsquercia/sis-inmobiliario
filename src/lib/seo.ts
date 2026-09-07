// Fuente única de verdad para todo lo que el sitio público le declara a
// buscadores/redes — dominio, nombre, datos de contacto. Un solo lugar
// para cambiar si algún día cambia el dominio o la dirección, en vez de
// tener el mismo dato pegado en 5 archivos de metadata distintos.

export const SITE_URL = "https://inmogp.com";
export const SITE_NAME = "Garcia Propiedades";
export const SITE_TAGLINE = "Inmobiliaria en Corrientes";
export const SITE_LOCALE = "es_AR";

export const BUSINESS = {
  streetAddress: "Mendoza 1055",
  addressLocality: "Corrientes",
  addressRegion: "Corrientes",
  addressCountry: "AR",
  telephone: "+543794088400",
  // Formato schema.org (día-día horaInicio-horaFin) — de corrido, sin
  // pausa de mediodía, confirmado por el usuario.
  openingHours: "Mo-Fr 09:00-17:00",
  instagram: "https://www.instagram.com/gpropiedades/",
} as const;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

// Recorta una descripción larga (ej. la de un aviso) a un largo prolijo
// para meta description — corta en el último espacio antes del límite
// para no partir una palabra a la mitad.
export function truncateDescription(text: string, maxLength = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`;
}
