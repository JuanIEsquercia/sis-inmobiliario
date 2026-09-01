import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { getAllAgentBalances } from "@/lib/agentes";
import { AgentesTabs } from "@/components/backoffice/AgentesTabs";
import { CustomMonthPicker } from "@/components/backoffice/CustomMonthPicker";

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  searchParams: Promise<{ mes?: string; anio?: string }>;
}

export default async function AgentesPage({ searchParams }: PageProps) {
  const profile = await requireProfile();

  // Sin agentes.ver_todos no hay listado que mostrar — vas directo a tu
  // propio saldo, que siempre podés ver.
  if (!profile.permissions.includes("agentes.ver_todos")) {
    redirect(`/backoffice/agentes/${profile.id}`);
  }

  const sp = await searchParams;
  const now = new Date();
  const month = Number(sp.mes) || now.getUTCMonth() + 1;
  const year = Number(sp.anio) || now.getUTCFullYear();

  const balances = await getAllAgentBalances({ month, year });

  return (
    <div>
      <AgentesTabs active="saldos" showEsquema={profile.permissions.includes("comisiones.ver")} />
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">Pagos a agentes</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Período:</span>
          <CustomMonthPicker month={month} year={year} basePath="/backoffice/agentes" />
        </div>
      </div>
      <p className="mb-6 text-sm text-muted">
        Lo que se le debe a cada agente sale de su parte en Ventas, Alquileres/Renovaciones y Tasaciones ya
        cargadas — se descuenta a medida que se le registran pagos. El saldo siempre es acumulado; lo pagado de
        cada tarjeta es solo del mes elegido arriba.
      </p>

      {balances.length === 0 ? (
        <p className="text-sm text-muted">No hay agentes activos.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {balances.map(({ agent, balances: agentBalances, pagadoEnMes }) => {
            const currencies = [
              ...new Set([...agentBalances.map((b) => b.currency), ...pagadoEnMes.map((p) => p.currency)]),
            ].sort();

            return (
              <Link
                key={agent.id}
                href={`/backoffice/agentes/${agent.id}`}
                className="rounded-xl border border-border p-4 text-sm transition-colors hover:bg-surface"
              >
                <p className="mb-3 font-medium text-foreground">
                  {agent.lastName} {agent.firstName}
                  <span className="ml-1.5 font-normal text-muted">@{agent.username}</span>
                </p>
                {currencies.length === 0 ? (
                  <p className="text-muted">Sin movimientos</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {currencies.map((currency) => {
                      const saldo = agentBalances.find((b) => b.currency === currency)?.saldo ?? 0;
                      const pagado = pagadoEnMes.find((p) => p.currency === currency)?.total ?? 0;
                      return (
                        <div key={currency} className="flex flex-col gap-1 rounded-lg bg-surface/60 p-2.5">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted">{currency}</p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted">Pagado este mes</span>
                            <span className="font-medium text-foreground">{fmtMoney(pagado)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted">Saldo pendiente</span>
                            <span className={`font-semibold ${saldo > 0 ? "text-accent" : "text-foreground"}`}>
                              {fmtMoney(saldo)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
