"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requirePermission } from "@/lib/auth";
import { requiredStr } from "@/lib/form-utils";
import {
  consultarDeudas,
  consultarHistoricas,
  consultarChequesRechazados,
  normalizeCuit,
  isValidCuit,
} from "@/lib/bcra";
import { ultimoPeriodo, peorSituacion } from "@/lib/central-deudores";

// Mismo permiso que crear contratos — a propósito, no uno nuevo: es
// exactamente el mismo agente que hoy tendría que entrar a mano a la
// web del BCRA para evaluar a su propio postulante, así que consultar
// acá es parte de la misma tarea, no una habilitación aparte.
const PERMISSION = "administraciones.crear";

// Dispara las 3 consultas (situación actual, histórico 24 meses,
// cheques rechazados) y guarda SIEMPRE una fila nueva — ya no se pisa
// la anterior por CUIT (ver comentario en el modelo CreditCheck): es un
// resguardo operativo ante el caso de que un agente se olvide de
// adjuntar el PDF al contrato, así el historial completo de consultas
// de esa persona sigue disponible para recuperarlo después. No hay
// caché de "todavía vigente, no reconsultar": cada clic en "Consultar"
// vuelve a golpear la API — el manual habla de un puñado de consultas
// por día para esta agencia, muy lejos de cualquier límite de tráfico
// real.
export async function consultarCreditCheck(formData: FormData) {
  const profile = await requirePermission(PERMISSION);
  const cuitRaw = requiredStr(formData.get("cuit"), "CUIT/CUIL");
  const cuit = normalizeCuit(cuitRaw);
  if (!isValidCuit(cuit)) {
    throw new Error("El CUIT/CUIL debe tener 11 dígitos (sin guiones).");
  }

  const [deudas, historicas, cheques] = await Promise.all([
    consultarDeudas(cuit),
    consultarHistoricas(cuit),
    consultarChequesRechazados(cuit),
  ]);

  const found = deudas.found || historicas.found || cheques.found;
  const denominacion =
    (deudas.found && deudas.data.denominacion) ||
    (historicas.found && historicas.data.denominacion) ||
    (cheques.found && cheques.data.denominacion) ||
    null;
  const periodo = deudas.found ? ultimoPeriodo(deudas.data) : null;
  const situacionActual = deudas.found ? peorSituacion(deudas.data) : null;

  const deudaData = deudas.found ? (deudas.data as unknown as Prisma.InputJsonValue) : Prisma.DbNull;
  const historicoData = historicas.found ? (historicas.data as unknown as Prisma.InputJsonValue) : Prisma.DbNull;
  const chequesRechazadosData = cheques.found ? (cheques.data as unknown as Prisma.InputJsonValue) : Prisma.DbNull;

  const created = await withRetry(() =>
    prisma.creditCheck.create({
      data: {
        cuit,
        denominacion,
        found,
        situacionActual,
        periodoInformado: periodo?.periodo ?? null,
        deudaData,
        historicoData,
        chequesRechazadosData,
        consultedById: profile.id,
      },
    })
  );

  revalidatePath("/backoffice/central-deudores");
  revalidatePath(`/backoffice/central-deudores/${cuit}`);
  redirect(`/backoffice/central-deudores/${cuit}/${created.id}`);
}

// Un CreditCheck no queda referenciado desde ningún otro registro (a
// diferencia de un Contract) — borrar una consulta puntual es una
// operación simple, sin resguardos especiales. Borra solo esa fila, no
// el resto del historial de ese CUIT. Mismo permiso que el resto del
// módulo.
export async function eliminarCreditCheck(cuit: string, id: number) {
  await requirePermission(PERMISSION);
  await withRetry(() => prisma.creditCheck.delete({ where: { id } }));
  revalidatePath("/backoffice/central-deudores");
  revalidatePath(`/backoffice/central-deudores/${cuit}`);
  redirect(`/backoffice/central-deudores/${cuit}`);
}
