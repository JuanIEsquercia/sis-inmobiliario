"use client";

import { useState } from "react";
import { buscarClientesVisitas } from "@/app/backoffice/(app)/visitas/actions";
import { ClientPicker } from "./ClientPicker";

// Interesado de la visita: un cliente (buscar o crear, como en el alta de
// contratos) o un pedido de búsqueda abierto.
export function InteresadoPicker({ pedidos }: { pedidos: { id: number; clienteNombre: string; zona: string | null }[] }) {
  const [tipo, setTipo] = useState<"cliente" | "pedido">("cliente");
  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="interesadoTipo" value={tipo} />
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" checked={tipo === "cliente"} onChange={() => setTipo("cliente")} />
          Un cliente
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={tipo === "pedido"} onChange={() => setTipo("pedido")} disabled={pedidos.length === 0} />
          Un pedido de búsqueda {pedidos.length === 0 && <span className="text-xs text-muted">(no hay abiertos)</span>}
        </label>
      </div>
      {tipo === "cliente" ? (
        <ClientPicker namePrefix="interesado" roleLabel="Interesado" search={buscarClientesVisitas} />
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Pedido*</span>
          <select name="pedidoId" required defaultValue="" className="field">
            <option value="" disabled>Elegir...</option>
            {pedidos.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.id} — {p.clienteNombre}
                {p.zona ? ` (${p.zona})` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
