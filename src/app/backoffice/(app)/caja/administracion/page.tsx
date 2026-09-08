import { requirePermission } from "@/lib/auth";
import { getCashMovements } from "@/lib/caja";
import { getPaymentsPendingFeeConfirmation, paymentBreakdown, clientLabel } from "@/lib/alquileres";
import { CajaTabs } from "@/components/backoffice/CajaTabs";
import { ResponsiveDataGrid } from "@/components/backoffice/ResponsiveDataGrid";
import { confirmarCobroComision } from "../actions";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

const monthNames = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const methodLabels: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
};

export default async function AdministracionCajaPage() {
  const profile = await requirePermission("caja.ver");
  const canConfirmar = profile.permissions.includes("caja.administracion.confirmar");
  const [movements, pendientes] = await Promise.all([
    getCashMovements({ source: "ADMINISTRACION" }),
    canConfirmar ? getPaymentsPendingFeeConfirmation() : Promise.resolve([]),
  ]);

  // Nunca se suma ARS con USD — un total por moneda.
  const totalsByCurrency = new Map<string, number>();
  for (const m of movements) {
    totalsByCurrency.set(m.currency, (totalsByCurrency.get(m.currency) ?? 0) + Number(m.amount));
  }

  return (
    <div className="space-y-6">
      <CajaTabs active="administracion" />

      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">Administración de Alquileres</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed max-w-3xl">
          Ingreso por el % de administración de cada liquidación mensual. Se suma a la Caja cuando se confirma
          que la inmobiliaria posee el dinero en mano.
        </p>
      </div>

      {canConfirmar && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Pendientes de confirmar cobro</h2>

          <ResponsiveDataGrid
            isEmpty={pendientes.length === 0}
            emptyMessage="No hay comisiones pagadas por el inquilino esperando confirmación."
            mobileCards={
              <>
                {pendientes.map((p) => {
                  const { managementFee } = paymentBreakdown(p.items, p.contract.managementFeePercent);
                  return (
                    <div key={p.id} className="rounded-2xl border border-border/60 bg-surface p-4 shadow-sm space-y-3">
                      <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-2.5">
                        <div>
                          <span className="font-mono text-xs font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-lg">
                            {p.contract.unit.propertyCode}
                          </span>
                          <p className="font-bold text-foreground text-sm mt-1">{p.contract.unit.address}</p>
                        </div>
                        <span className="text-xs font-semibold text-muted bg-background px-2.5 py-1 rounded-lg border border-border">
                          {monthNames[p.periodMonth - 1]} {p.periodYear}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                          <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Propietario</span>
                          <span className="font-semibold text-foreground truncate block">{clientLabel(p.contract.owner)}</span>
                        </div>
                        <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                          <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Comisión</span>
                          <span className="font-extrabold text-foreground">
                            {p.currency} {fmtMoney(managementFee)}
                          </span>
                        </div>
                      </div>

                      <form action={confirmarCobroComision.bind(null, p.id)} className="flex items-center gap-2 pt-1 border-t border-border/40">
                        <select name="method" defaultValue="TRANSFERENCIA" className="field flex-1 py-1.5 text-xs" required>
                          <option value="EFECTIVO">Efectivo</option>
                          <option value="TRANSFERENCIA">Transferencia</option>
                        </select>
                        <button
                          type="submit"
                          className="h-9 px-4 rounded-xl bg-accent text-xs font-bold text-accent-foreground hover:bg-accent-strong cursor-pointer shrink-0"
                        >
                          Confirmar
                        </button>
                      </form>
                    </div>
                  );
                })}
              </>
            }
            table={
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3">Período</th>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Propietario</th>
                    <th className="px-4 py-3">Comisión</th>
                    <th className="px-4 py-3 text-right">Confirmar</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map((p) => {
                    const { managementFee } = paymentBreakdown(p.items, p.contract.managementFeePercent);
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                        <td className="px-4 py-3 text-muted font-medium">
                          {monthNames[p.periodMonth - 1]} {p.periodYear}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {p.contract.unit.propertyCode} — {p.contract.unit.address}
                        </td>
                        <td className="px-4 py-3 text-muted">{clientLabel(p.contract.owner)}</td>
                        <td className="px-4 py-3 font-bold text-foreground">
                          {p.currency} {fmtMoney(managementFee)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <form action={confirmarCobroComision.bind(null, p.id)} className="inline-flex items-center gap-1.5">
                            <select name="method" defaultValue="TRANSFERENCIA" className="field w-auto py-1 text-xs" required>
                              <option value="EFECTIVO">Efectivo</option>
                              <option value="TRANSFERENCIA">Transferencia</option>
                            </select>
                            <button
                              type="submit"
                              className="rounded-lg border border-border px-3 py-1 text-xs font-semibold hover:bg-surface cursor-pointer"
                            >
                              Confirmar
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            }
          />
        </section>
      )}

      {totalsByCurrency.size > 0 && (
        <div className="flex flex-wrap gap-4">
          {[...totalsByCurrency.entries()].map(([currency, total]) => (
            <div key={currency} className="rounded-2xl border border-border/60 bg-surface px-5 py-3.5 text-sm shadow-xs">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block">Total Acumulado ({currency})</span>
              <span className="font-extrabold text-foreground text-lg">{currency} {fmtMoney(total)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Ingresos de Administración Confirmados</h2>

        <ResponsiveDataGrid
          isEmpty={movements.length === 0}
          emptyMessage="Todavía no hay ingresos de administración confirmados."
          mobileCards={
            <>
              {movements.map((m) => (
                <div key={m.id} className="rounded-2xl border border-border/60 bg-surface p-4 shadow-sm space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-foreground text-sm">{m.description}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-muted bg-background border border-border px-2 py-0.5 rounded-lg">
                        Medio: {m.method ? methodLabels[m.method] : "—"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-foreground text-base block">
                        {m.currency} {fmtMoney(Number(m.amount))}
                      </span>
                      <span className="text-xs text-muted font-medium">{fmtDate.format(m.occurredAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          }
          table={
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">Medio</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 text-muted font-medium">{fmtDate.format(m.occurredAt)}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{m.description}</td>
                    <td className="px-4 py-3 text-muted">{m.method ? methodLabels[m.method] : "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">
                      {m.currency} {fmtMoney(Number(m.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        />
      </div>
    </div>
  );
}
