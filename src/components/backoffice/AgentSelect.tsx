import type { getAgents } from "@/lib/caja";

type Agent = Awaited<ReturnType<typeof getAgents>>[number];

export function AgentSelect({
  agents,
  defaultValue,
  name = "agentId",
}: {
  agents: Agent[];
  defaultValue?: string;
  name?: string;
}) {
  return (
    <select name={name} required defaultValue={defaultValue ?? ""} className="field">
      <option value="" disabled>
        Vendedor/comisionista
      </option>
      {agents.map((a) => (
        <option key={a.id} value={a.id}>
          {a.lastName} {a.firstName} (@{a.username})
        </option>
      ))}
    </select>
  );
}
