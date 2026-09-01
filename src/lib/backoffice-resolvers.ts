import { optionalInt, optionalStr, requiredStr } from "@/lib/form-utils";
import type { Prisma } from "@/generated/prisma/client";

// Devuelve el id de un Client existente (si vino `${prefix}.clientId`
// desde ClientPicker) o crea uno nuevo con los campos `${prefix}.*`.
// Client es pura identidad/contacto — nunca guarda nada financiero, así
// que crearlo acá no arriesga mezclar mora/deuda entre roles.
export async function resolveClient(
  tx: Prisma.TransactionClient,
  formData: FormData,
  prefix: string,
  roleLabel: string
): Promise<number> {
  const existingId = optionalInt(formData.get(`${prefix}.clientId`));
  if (existingId) return existingId;

  const birthDateRaw = optionalStr(formData.get(`${prefix}.birthDate`));

  const client = await tx.client.create({
    data: {
      firstName: requiredStr(formData.get(`${prefix}.firstName`), `Nombre (${roleLabel})`),
      lastName: requiredStr(formData.get(`${prefix}.lastName`), `Apellido (${roleLabel})`),
      docId: optionalStr(formData.get(`${prefix}.docId`)),
      phone: optionalStr(formData.get(`${prefix}.phone`)),
      email: optionalStr(formData.get(`${prefix}.email`)),
      birthDate: birthDateRaw ? new Date(birthDateRaw) : null,
    },
  });
  return client.id;
}

// Mismo criterio que resolveClient, pero para partes que no siempre se
// conocen al momento del alta (comprador/vendedor de una Venta) — si el
// ClientPicker quedó sin tocar (ni eligieron uno existente ni tipearon
// uno nuevo), devuelve null en vez de exigir un nombre que el usuario
// nunca tuvo intención de cargar todavía. Si SÍ empezó a tipear algo
// (aunque sea un campo suelto), ahí sí exige nombre/apellido completos
// — a medio completar es un error real, en blanco no lo es.
export async function resolveClientOptional(
  tx: Prisma.TransactionClient,
  formData: FormData,
  prefix: string,
  roleLabel: string
): Promise<number | null> {
  const existingId = optionalInt(formData.get(`${prefix}.clientId`));
  if (existingId) return existingId;

  const touched = [
    "firstName",
    "lastName",
    "docId",
    "phone",
    "email",
    "birthDate",
  ].some((field) => optionalStr(formData.get(`${prefix}.${field}`)) !== null);

  if (!touched) return null;

  return resolveClient(tx, formData, prefix, roleLabel);
}

// Mismo criterio que resolveClient, pero para Unit — con upsert por
// propertyCode como red de seguridad si se tipeó a mano un código que
// ya existe en vez de elegirlo con UnitPicker.
export async function resolveUnit(tx: Prisma.TransactionClient, formData: FormData): Promise<number> {
  const existingId = optionalInt(formData.get("unit.id"));
  if (existingId) return existingId;

  const propertyCode = requiredStr(formData.get("unit.propertyCode"), "Código de propiedad");

  const unit = await tx.unit.upsert({
    where: { propertyCode },
    create: {
      propertyCode,
      address: requiredStr(formData.get("unit.address"), "Dirección de la unidad"),
      city: optionalStr(formData.get("unit.city")),
      propertyType: optionalStr(formData.get("unit.propertyType")),
    },
    update: {},
  });
  return unit.id;
}
