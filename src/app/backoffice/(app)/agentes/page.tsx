import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getAllAgentBalances } from "@/lib/agentes";
import { AgentesTabs } from "@/components/backoffice/AgentesTabs";

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

export default async function AgentesPage() {
  const profile = await requireProfile();

  // Sin agentes.ver_todos no hay listado que mostrar — vas directo a tu
  // propio saldo, que siempre podés ver.
  if (!profile.permissions.includes("agentes.ver_todos")) {
    redirect(`/backoffice/agentes/${profile.id}`);
  }

  const balances = await getAllAgentBalances();

  return (
    <div>
      <AgentesTabs active="saldos" showEsquema={profile.permissions.includes("comisiones.ver")} />
      <h1 className="mb-1 text-xl font-semibold text-foreground">Pagos a agentes</h1>
      <p className="mb-6 text-sm text-muted">
        Lo que se le debe a cada agente sale de su parte en Ventas, Alquileres/Renovaciones y Tasaciones ya
        cargadas — se descuenta a medida que se le registran pagos.
      </p>

      {balances.length === 0 ? (
        <p className="text-sm text-muted">No hay agentes activos.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Agente</th>
                <th className="px-4 py-3">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {balances.map(({ agent, balances: agentBalances }) => (
                <tr key={agent.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3">
                    <Link
                      href={`/backoffice/agentes/${agent.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {agent.lastName} {agent.firstName}
                    </Link>
                    <span className="ml-1.5 text-muted">@{agent.username}</span>
                  </td>
                  <td className="px-4 py-3">
                    {agentBalances.length === 0 ? (
                      <span className="text-muted">Sin movimientos</span>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {agentBalances.map((b) => (
                          <span
                            key={b.currency}
                            className={`font-medium ${b.saldo > 0 ? "text-accent" : "text-muted"}`}
                          >
                            {b.currency} {fmtMoney(b.saldo)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
