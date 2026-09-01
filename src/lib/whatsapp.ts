// Número oficial de la inmobiliaria — el que se muestra en el pie de
// página del sitio y el que se usa para "Consultar por WhatsApp" desde
// la ficha de una propiedad (a diferencia del teléfono de cada agente en
// /equipo, que es personal y va aparte).
export const AGENCY_PHONE = "3794 08-8400";

// El teléfono de contacto de un usuario se carga como texto libre (sin
// formato forzado, ver usuarios/nuevo) — puede venir con o sin +54, con
// guiones, espacios, paréntesis, o con el 0 de larga distancia. wa.me
// necesita el número en formato internacional puro (solo dígitos) y,
// para un celular argentino, con el "9" después del 54 (no está en el
// número que la gente dicta de palabra, pero WhatsApp lo exige) — ver
// https://faq.whatsapp.com/general/chats/how-to-use-click-to-chat.
// No cubre todos los formatos posibles (ej. prefijo "15" local), pero sí
// el caso común de un celular cargado en formato local o con +54.
export function toWhatsAppLink(phoneRaw: string, message?: string): string {
  let digits = phoneRaw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits.startsWith("54")) digits = `549${digits}`;
  else if (!digits.startsWith("549")) digits = `549${digits.slice(2)}`;

  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${query}`;
}
