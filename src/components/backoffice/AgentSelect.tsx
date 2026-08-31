import type { getAgents } from "@/lib/caja";

type Agent = Awaited<ReturnType<typeof getAgents>>[number];

export function AgentSelect({
  agents,
  defaultValue,
  name = "agentId",
  label = "Vendedor/comisionista",
  required = true,
}: {
  agents: Agent[];
  defaultValue?: string;
  name?: string;
  label?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-xs text-muted">
        {label}
        {required ? "*" : ""}
      </label>
      <select id={name} name={name} required={required} defaultValue={defaultValue ?? ""} className="field">
        {required ? (
          <option value="" disabled>
            Elegir...
          </option>
        ) : (
          <option value="">— Inmobiliaria (sin agente) —</option>
        )}
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.lastName} {a.firstName} (@{a.username})
          </option>
        ))}
      </select>
    </div>
  );
}
