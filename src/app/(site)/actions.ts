"use server";

import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { optionalDecimal, optionalInt, optionalStr, requiredStr } from "@/lib/form-utils";

// Único punto de escritura sin login de todo el sistema — todo lo demás
// pasa por requirePermission. Sin Profile detrás (creadoPorId queda
// null, ver comentario en el modelo), así que la única defensa contra
// spam/bots es este honeypot: un campo que ningún visitante real
// completa (queda oculto por CSS) pero que un bot que llena todos los
// inputs sí. Si viene con algo cargado, se responde "éxito" igual (para
// no darle feedback útil a quien lo mandó) pero no se guarda nada.
export async function crearPedidoPublico(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  if (optionalStr(formData.get("empresa"))) {
    return { ok: true };
  }

  try {
    const clienteNombre = requiredStr(formData.get("clienteNombre"), "Nombre");
    const operationType = requiredStr(formData.get("operationType"), "Operación");

    await withRetry(() =>
      prisma.pedido.create({
        data: {
          clienteNombre,
          clienteTelefono: optionalStr(formData.get("clienteTelefono")),
          clienteEmail: optionalStr(formData.get("clienteEmail")),
          operationType,
          propertyType: optionalStr(formData.get("propertyType")),
          zona: optionalStr(formData.get("zona")),
          precioMin: optionalDecimal(formData.get("precioMin")),
          precioMax: optionalDecimal(formData.get("precioMax")),
          moneda: optionalStr(formData.get("moneda")),
          ambientesMin: optionalInt(formData.get("ambientesMin")),
          notas: optionalStr(formData.get("notas")),
          creadoPorId: null,
        },
      })
    );

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo enviar la consulta." };
  }
}
