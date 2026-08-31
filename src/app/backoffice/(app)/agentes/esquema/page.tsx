import { requirePermission } from "@/lib/auth";
import { getAgents, getCommissionSchemeHistory } from "@/lib/caja";
import { AgentesTabs } from "@/components/backoffice/AgentesTabs";
import { AgentSelect } from "@/components/backoffice/AgentSelect";
import { crearEsquemaComision } from "../actions";
import type { CommissionSchemeType } from "@/generated/prisma/client";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

const typeLabels: Record<CommissionSchemeType, string> = {
  VENTA: "Ventas",
  ALQUILER: "Alquileres",
  RENOVACION: "Renovaciones",
};

// Placeholders del flujo que el usuario definió, para que el admin los
// confirme (o los ajuste) la primera vez que carga cada esquema. Las
// renovaciones son una unidad de negocio distinta, sin reparto por
// agente vendedor/captador todavía — arranca en 0/0 (no en blanco,
// porque el campo es requerido) hasta que se defina cómo se van a
// repartir esos participantes, si es que corresponde.
const defaults: Record<CommissionSchemeType, { vendedor: string; captador: string }> = {
  VENTA: { vendedor: "30", captador: "20" },
  ALQUILER: { vendedor: "25", captador: "25" },
  RENOVACION: { vendedor: "0", captador: "0" },
};

export default async function EsquemaPage() {
  const profile = await requirePermission("comisiones.ver");
  const canManage = profile.permissions.includes("comisiones.gestionar");

  const [agents, ventaHistory, alquilerHistory, renovacionHistory] = await Promise.all([
    getAgents(),
    getCommissionSchemeHistory("VENTA"),
    getCommissionSchemeHistory("ALQUILER"),
    getCommissionSchemeHistory("RENOVACION"),
  ]);

  const sections: { type: CommissionSchemeType; history: typeof ventaHistory }[] = [
    { type: "VENTA", history: ventaHistory },
    { type: "ALQUILER", history: alquilerHistory },
    { type: "RENOVACION", history: renovacionHistory },
  ];

  return (
    <div>
      <AgentesTabs active="esquema" showEsquema />
      <h1 className="mb-1 text-xl font-semibold text-foreground">Esquema de comisiones</h1>
      <p className="mb-6 text-sm text-muted">
        Cada edición carga una versión nueva — las ventas y alquileres ya cerrados conservan el reparto con el que se
        calcularon, aunque el esquema cambie después.
      </p>

      <div className="flex flex-col gap-10">
        {sections.map(({ type, history }) => {
          const active = history[0];
          const previous = history.slice(1);
          const agencia = active ? 100 - Number(active.vendedorPercent) - Number(active.captadorPercent) : null;

          return (
            <section key={type}>
              <h2 className="mb-3 text-lg font-semibold text-foreground">{typeLabels[type]}</h2>

              {active ? (
                <dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl border border-border p-5 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted">Fondo de reserva</dt>
                    <dd className="text-foreground">{active.reservaPercent.toString()}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted">
                      Agente fijo ({active.agenteFijo.firstName} {active.agenteFijo.lastName})
                    </dt>
                    <dd className="text-foreground">{active.agenteFijoPercent.toString()}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Vendedor (del resto)</dt>
                    <dd className="text-foreground">{active.vendedorPercent.toString()}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Captador (del resto)</dt>
                    <dd className="text-foreground">{active.captadorPercent.toString()}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Inmobiliaria (del resto)</dt>
                    <dd className="text-foreground">{agencia}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Vigente desde</dt>
                    <dd className="text-foreground">{fmtDate.format(active.vigenteDesde)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mb-3 text-sm text-muted">Todavía no hay ningún esquema configurado para {typeLabels[type].toLowerCase()}.</p>
              )}

              {previous.length > 0 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-muted hover:text-foreground">
                    Ver {previous.length} versión{previous.length === 1 ? "" : "es"} anterior{previous.length === 1 ? "" : "es"}
                  </summary>
                  <div className="mt-2 overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-left uppercase tracking-wide text-muted">
                          <th className="px-3 py-2">Vigente desde</th>
                          <th className="px-3 py-2">Reserva</th>
                          <th className="px-3 py-2">Agente fijo</th>
                          <th className="px-3 py-2">Vendedor</th>
                          <th className="px-3 py-2">Captador</th>
                          <th className="px-3 py-2">Cargado por</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previous.map((h) => (
                          <tr key={h.id} className="border-b border-border last:border-0">
                            <td className="px-3 py-2 text-muted">{fmtDate.format(h.vigenteDesde)}</td>
                            <td className="px-3 py-2">{h.reservaPercent.toString()}%</td>
                            <td className="px-3 py-2">
                              {h.agenteFijoPercent.toString()}% ({h.agenteFijo.firstName} {h.agenteFijo.lastName})
                            </td>
                            <td className="px-3 py-2">{h.vendedorPercent.toString()}%</td>
                            <td className="px-3 py-2">{h.captadorPercent.toString()}%</td>
                            <td className="px-3 py-2 text-muted">
                              @{h.createdBy.username}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}

              {canManage && (
                <form
                  action={crearEsquemaComision.bind(null, type)}
                  className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-border p-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted">% fondo de reserva</label>
                    <input
                      name="reservaPercent"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={active ? active.reservaPercent.toString() : "2.5"}
                      className="field w-24"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted">% agente fijo</label>
                    <input
                      name="agenteFijoPercent"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={active ? active.agenteFijoPercent.toString() : "7.5"}
                      className="field w-24"
                    />
                  </div>
                  <AgentSelect
                    agents={agents}
                    name="agenteFijoId"
                    label="Agente fijo"
                    defaultValue={active?.agenteFijoId}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted">% vendedor (del resto)</label>
                    <input
                      name="vendedorPercent"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={active ? active.vendedorPercent.toString() : defaults[type].vendedor}
                      className="field w-24"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted">% captador (del resto)</label>
                    <input
                      name="captadorPercent"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={active ? active.captadorPercent.toString() : defaults[type].captador}
                      className="field w-24"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
                  >
                    {active ? "Cargar nueva versión" : "Configurar esquema"}
                  </button>
                </form>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
