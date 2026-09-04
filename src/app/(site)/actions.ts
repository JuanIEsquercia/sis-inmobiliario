"use server";

import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { optionalDecimal, optionalInt, optionalStr, requiredStr } from "@/lib/form-utils";

// Topes de largo por campo — es el único endpoint sin login, así que
// nada impide que un bot mande megabytes en "notas" hasta llenar la
// base. Son generosos para cualquier consulta real.
const MAX_LEN = {
  clienteNombre: 120,
  clienteTelefono: 40,
  clienteEmail: 160,
  propertyType: 60,
  zona: 120,
  moneda: 10,
  notas: 2000,
} as const;

const OPERATION_TYPES = ["Venta", "Alquiler"] as const;

function capped(v: FormDataEntryValue | null, field: keyof typeof MAX_LEN): string | null {
  const s = optionalStr(v);
  if (s !== null && s.length > MAX_LEN[field]) {
    throw new Error("Uno de los campos es demasiado largo.");
  }
  return s;
}

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
    const clienteNombre = capped(formData.get("clienteNombre"), "clienteNombre");
    if (!clienteNombre) throw new Error(`Falta "Nombre"`);

    const operationType = requiredStr(formData.get("operationType"), "Operación");
    if (!(OPERATION_TYPES as readonly string[]).includes(operationType)) {
      throw new Error("Operación inválida.");
    }

    const clienteEmail = capped(formData.get("clienteEmail"), "clienteEmail");
    if (clienteEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clienteEmail)) {
      throw new Error("El email no parece válido.");
    }

    const ambientesMin = optionalInt(formData.get("ambientesMin"));
    if (ambientesMin !== null && (ambientesMin < 0 || ambientesMin > 50)) {
      throw new Error("La cantidad de ambientes no es válida.");
    }

    await withRetry(() =>
      prisma.pedido.create({
        data: {
          clienteNombre,
          clienteTelefono: capped(formData.get("clienteTelefono"), "clienteTelefono"),
          clienteEmail,
          operationType,
          propertyType: capped(formData.get("propertyType"), "propertyType"),
          zona: capped(formData.get("zona"), "zona"),
          precioMin: optionalDecimal(formData.get("precioMin")),
          precioMax: optionalDecimal(formData.get("precioMax")),
          moneda: capped(formData.get("moneda"), "moneda"),
          ambientesMin,
          notas: capped(formData.get("notas"), "notas"),
          creadoPorId: null,
        },
      })
    );

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo enviar la consulta." };
  }
}
