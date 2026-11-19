"use client";

import { useState } from "react";
import { ActionForm } from "./ActionForm";
import type { ResultadoAccion } from "@/lib/accion";
import { AgentSelect } from "./AgentSelect";
import type { getAgents } from "@/lib/caja";

type Agent = Awaited<ReturnType<typeof getAgents>>[number];

// Antes esto era un formulario siempre abierto, aunque los agentes ya se
// hubieran cargado al alta del contrato — puro ruido en el lateral para
// el caso normal (ya están bien). Por default muestra solo lectura;
// "Editar" revela el form nada más si hace falta corregir algo.
export function EditableAgentesCard({
  agents,
  defaultVendedorId,
  defaultCaptadorId,
  vendedorLabel,
  captadorLabel,
  canEdit,
  action,
}: {
  agents: Agent[];
  defaultVendedorId?: string;
  defaultCaptadorId?: string;
  vendedorLabel: string;
  captadorLabel: string;
  canEdit: boolean;
  action: (formData: FormData) => Promise<ResultadoAccion>;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-xs text-muted flex flex-col gap-1">
          <span><strong>Vendedor:</strong> {vendedorLabel}</span>
          <span><strong>Captador:</strong> {captadorLabel}</span>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-fit text-xs font-semibold text-accent hover:underline cursor-pointer"
          >
            Editar
          </button>
        )}
      </div>
    );
  }

  return (
    <ActionForm
      action={action}
      mensajeExito="Agentes actualizados"
      // Vuelve a solo lectura recién cuando se guardó; si falla, queda
      // abierto con lo elegido para corregir y reintentar.
      onExito={() => setEditing(false)}
      className="flex flex-col gap-3"
    >
      <AgentSelect agents={agents} defaultValue={defaultVendedorId} name="vendedorAgentId" label="Agente vendedor" required={false} />
      <AgentSelect agents={agents} defaultValue={defaultCaptadorId} name="captadorAgentId" label="Agente captador" required={false} />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="flex-1 rounded-lg border border-border bg-surface py-2 text-xs font-bold uppercase tracking-wider hover:bg-surface/10 hover:text-foreground cursor-pointer transition-colors"
        >
          Guardar Agentes
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:text-foreground cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </ActionForm>
  );
}
