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

  const docId = optionalStr(formData.get(`${prefix}.docId`));

  // El error más común al cargar "cliente nuevo" a mano en vez de
  // buscarlo: la misma persona termina duplicada porque nadie la buscó
  // primero. El DNI es la clave real de identidad acá — si ya existe un
  // Client con este DNI, no se crea uno nuevo (nunca se fusiona solo:
  // podría ser un tipeo real de otro DNI), se corta con un error claro
  // para que se busque y se elija el que ya existe.
  if (docId) {
    const existing = await tx.client.findFirst({
      where: { docId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (existing) {
      throw new Error(
        `Ya existe un cliente con DNI ${docId}: ${existing.firstName} ${existing.lastName}. Buscalo por nombre o DNI en "${roleLabel}" en vez de cargarlo de nuevo.`
      );
    }
  }

  const birthDateRaw = optionalStr(formData.get(`${prefix}.birthDate`));

  const client = await tx.client.create({
    data: {
      firstName: requiredStr(formData.get(`${prefix}.firstName`), `Nombre (${roleLabel})`),
      lastName: requiredStr(formData.get(`${prefix}.lastName`), `Apellido (${roleLabel})`),
      docId,
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
