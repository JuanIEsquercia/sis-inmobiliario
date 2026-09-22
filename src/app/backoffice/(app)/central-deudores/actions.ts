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

// Clave propia del módulo (antes reutilizaba administraciones.crear):
// es una entrada aparte del menú con datos financieros personales, y
// tiene que poder darse o sacarse por separado de "cargar contratos".
// Consultar y borrar son dos claves distintas — borrar historial es
// tarea de quien administra, no del agente que evalúa postulantes.
const PERMISSION = "central_deudores.consultar";
const PERMISSION_ELIMINAR = "central_deudores.eliminar";

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
// Ventana anti-duplicado. La consulta tarda varios segundos (3 llamadas
// al BCRA), y mientras tanto el formulario no daba ninguna señal de
// estar trabajando: el agente volvía a apretar y quedaban 2 (o 3)
// consultas idénticas del mismo CUIT separadas por segundos — pasó de
// verdad, 5 de las primeras 12 filas guardadas eran de ese tipo. El
// arreglo de fondo es el botón que se deshabilita solo (SubmitButton),
// esto es el cinturón de seguridad del lado del servidor por si el POST
// igual llega dos veces (doble click justo, F5, reintento del browser).
//
// Reusar en vez de crear no pierde información: el BCRA publica datos
// mensuales, así que dos consultas del mismo CUIT separadas por segundos
// devuelven exactamente lo mismo.
const VENTANA_ANTIDUPLICADO_MS = 60_000;

async function buscarConsultaReciente(cuit: string, profileId: string) {
  return withRetry(() =>
    prisma.creditCheck.findFirst({
      where: {
        cuit,
        consultedById: profileId,
        consultedAt: { gte: new Date(Date.now() - VENTANA_ANTIDUPLICADO_MS) },
      },
      orderBy: { consultedAt: "desc" },
      select: { id: true },
    })
  );
}

export async function consultarCreditCheck(formData: FormData) {
  const profile = await requirePermission(PERMISSION);
  const cuitRaw = requiredStr(formData.get("cuit"), "CUIT/CUIL");
  const cuit = normalizeCuit(cuitRaw);
  if (!isValidCuit(cuit)) {
    throw new Error("El CUIT/CUIL debe tener 11 dígitos (sin guiones).");
  }

  // Primer chequeo: si el envío anterior ya terminó, se corta acá y ni
  // siquiera se molesta al BCRA de nuevo.
  const yaConsultado = await buscarConsultaReciente(cuit, profile.id);
  if (yaConsultado) {
    redirect(`/backoffice/central-deudores/${cuit}/${yaConsultado.id}`);
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

  // Segundo chequeo, ahora sí el que atrapa el caso real: las dos
  // consultas arrancan casi juntas (el doble click pasa mientras la
  // primera todavía está esperando al BCRA), así que la única ventana
  // donde se puede detectar es recién acá, ya con las 3 respuestas en
  // mano y con la primera fila muy probablemente confirmada.
  const duplicado = await buscarConsultaReciente(cuit, profile.id);
  if (duplicado) {
    redirect(`/backoffice/central-deudores/${cuit}/${duplicado.id}`);
  }

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
// el resto del historial de ese CUIT.
export async function eliminarCreditCheck(cuit: string, id: number) {
  await requirePermission(PERMISSION_ELIMINAR);
  await withRetry(() => prisma.creditCheck.delete({ where: { id } }));
  revalidatePath("/backoffice/central-deudores");
  revalidatePath(`/backoffice/central-deudores/${cuit}`);
  redirect(`/backoffice/central-deudores/${cuit}`);
}
