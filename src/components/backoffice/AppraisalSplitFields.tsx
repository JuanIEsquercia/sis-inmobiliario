"use client";

import { useState } from "react";
import { AgentSelect } from "./AgentSelect";

type Agent = Parameters<typeof AgentSelect>[0]["agents"];

// Toggle "reparto 50/50 opcional" de una tasación: el AgentSelect solo
// se muestra (y solo se exige) cuando el checkbox está tildado.
export function AppraisalSplitFields({ agents }: { agents: Agent }) {
  const [hasSplit, setHasSplit] = useState(false);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium text-foreground">Reparto</legend>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="hasAgentSplit"
          checked={hasSplit}
          onChange={(e) => setHasSplit(e.target.checked)}
        />
        Repartir 50/50 con un agente (si no se marca, el 100% queda para la inmobiliaria)
      </label>
      {hasSplit && <AgentSelect agents={agents} name="agentId" label="Agente" required />}
    </fieldset>
  );
}
