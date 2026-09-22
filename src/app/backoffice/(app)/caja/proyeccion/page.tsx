import { requirePermission } from "@/lib/auth";
import { getProjection, getProjectionSettings } from "@/lib/caja";
import { CajaTabs } from "@/components/backoffice/CajaTabs";
import { ResponsiveDataGrid } from "@/components/backoffice/ResponsiveDataGrid";
import { guardarProjectionSettings } from "../actions";

const monthNames = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

const MONTHS_AHEAD = 6;

export default async function ProyeccionPage() {
  const profile = await requirePermission("caja.proyeccion.ver");
  const canConfigure = profile.permissions.includes("caja.proyeccion.configurar");

  const [months, settings] = await Promise.all([getProjection(MONTHS_AHEAD), getProjectionSettings()]);

  const currencies = new Set<string>();
  for (const m of months) {
    for (const c of m.cobranzaByCurrency.keys()) currencies.add(c);
    for (const c of m.renovacionesByCurrency.keys()) currencies.add(c);
    for (const c of m.gastosFijosByCurrency.keys()) currencies.add(c);
  }

  return (
    <div className="space-y-6">
      <CajaTabs active="proyeccion" />

      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">Proyección Financiera</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed max-w-3xl">
          Proyección plana a {MONTHS_AHEAD} meses basada en contratos pactados, renovaciones y gastos fijos.
          El neto proyecta <strong className="text-foreground font-semibold">lo que gana la inmobiliaria</strong> (honorarios
          de administración + comisión de renovación − gastos fijos), no la cobranza total: lo que paga el inquilino
          es casi todo del propietario y solo pasa por nosotros.
        </p>
      </div>

      <section className="rounded-2xl border border-dashed border-border/70 bg-surface/40 p-4 sm:p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Banda de Corrección por Indexación</h2>
        <p className="text-xs text-muted/90 mb-4 leading-relaxed">
          Estimación adicional por aumentos de indexación pendientes sobre el monto pactado vigente hoy.
        </p>
        {canConfigure ? (
          <form action={guardarProjectionSettings} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="min" className="text-xs font-medium text-muted">
                % Mínimo
              </label>
              <input
                id="min"
                name="indexationCorrectionMinPercent"
                type="number"
                step="0.1"
                required
                defaultValue={settings.indexationCorrectionMinPercent}
                className="field w-28"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="max" className="text-xs font-medium text-muted">
                % Máximo
              </label>
              <input
                id="max"
                name="indexationCorrectionMaxPercent"
                type="number"
                step="0.1"
                required
                defaultValue={settings.indexationCorrectionMaxPercent}
                className="field w-28"
              />
            </div>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl border border-border bg-surface text-xs font-semibold text-foreground hover:bg-background transition-colors cursor-pointer"
            >
              Guardar Ajustes
            </button>
          </form>
        ) : (
          <p className="text-sm font-bold text-foreground">
            {settings.indexationCorrectionMinPercent}% – {settings.indexationCorrectionMaxPercent}%
          </p>
        )}
      </section>

      {currencies.size === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-surface p-12 text-center">
          <p className="text-sm text-muted">No hay alquileres vigentes ni gastos fijos para proyectar.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...currencies].sort().map((currency) => (
            <div key={currency} className="space-y-3">
              <h2 className="text-base font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Moneda: {currency}
              </h2>

              <ResponsiveDataGrid
                isEmpty={false}
                mobileCards={
                  <>
                    {months.map((m) => {
                      const cobranza = m.cobranzaByCurrency.get(currency) ?? 0;
                      const honorarios = m.honorariosByCurrency.get(currency) ?? 0;
                      const renovacion = m.renovacionesByCurrency.get(currency) ?? 0;
                      const gastosFijos = m.gastosFijosByCurrency.get(currency) ?? 0;
                      const neto = honorarios + renovacion - gastosFijos;
                      // La banda de corrección por indexación se aplica
                      // sobre los honorarios (el ingreso real): si sube
                      // el alquiler, sube la comisión en la misma
                      // proporción.
                      const bandaMin = honorarios * (1 + settings.indexationCorrectionMinPercent / 100);
                      const bandaMax = honorarios * (1 + settings.indexationCorrectionMaxPercent / 100);

                      return (
                        <div key={`${m.year}-${m.month}`} className="rounded-2xl border border-border/60 bg-surface p-4 shadow-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                            <span className="font-bold text-foreground text-base">
                              {monthNames[m.month - 1]} {m.year}
                            </span>
                            <span className="font-extrabold text-accent text-base">
                              Neto: {currency} {fmtMoney(neto)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                              <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Honorarios Administración</span>
                              <span className="font-semibold text-foreground">{currency} {fmtMoney(honorarios)}</span>
                            </div>
                            <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                              <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Comisión Renovación</span>
                              <span className="font-semibold text-foreground">{renovacion > 0 ? `${currency} ${fmtMoney(renovacion)}` : "—"}</span>
                            </div>
                            <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                              <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Gastos Fijos</span>
                              <span className="font-semibold text-foreground">{gastosFijos > 0 ? `− ${currency} ${fmtMoney(gastosFijos)}` : "—"}</span>
                            </div>
                            <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                              <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Honorarios Estimado Real</span>
                              <span className="font-semibold text-foreground">
                                {honorarios > 0 ? `${fmtMoney(bandaMin)} – ${fmtMoney(bandaMax)}` : "—"}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-xl border border-dashed border-border/60 px-2.5 py-2 text-[11px] text-muted">
                            Cobranza administrada (del propietario, pasa por nosotros):{" "}
                            <span className="font-semibold text-foreground">{currency} {fmtMoney(cobranza)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                }
                table={
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                        <th className="px-4 py-3">Mes</th>
                        <th className="px-4 py-3">Honorarios administración</th>
                        <th className="px-4 py-3">Estimado real (+{settings.indexationCorrectionMinPercent}/+{settings.indexationCorrectionMaxPercent}%)</th>
                        <th className="px-4 py-3">Comisión renovación</th>
                        <th className="px-4 py-3">Gastos fijos</th>
                        <th className="px-4 py-3 text-right">Neto proyectado</th>
                        <th className="px-4 py-3 text-right font-normal normal-case text-muted/70">Cobranza administrada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map((m) => {
                        const cobranza = m.cobranzaByCurrency.get(currency) ?? 0;
                        const honorarios = m.honorariosByCurrency.get(currency) ?? 0;
                        const renovacion = m.renovacionesByCurrency.get(currency) ?? 0;
                        const gastosFijos = m.gastosFijosByCurrency.get(currency) ?? 0;
                        const neto = honorarios + renovacion - gastosFijos;
                        const bandaMin = honorarios * (1 + settings.indexationCorrectionMinPercent / 100);
                        const bandaMax = honorarios * (1 + settings.indexationCorrectionMaxPercent / 100);
                        return (
                          <tr key={`${m.year}-${m.month}`} className="border-b border-border last:border-0 hover:bg-surface">
                            <td className="px-4 py-3 text-muted font-medium">
                              {monthNames[m.month - 1]} {m.year}
                            </td>
                            <td className="px-4 py-3 font-semibold text-foreground">{fmtMoney(honorarios)}</td>
                            <td className="px-4 py-3 text-muted">
                              {honorarios > 0 ? `${fmtMoney(bandaMin)} – ${fmtMoney(bandaMax)}` : "—"}
                            </td>
                            <td className="px-4 py-3 text-muted">{renovacion > 0 ? fmtMoney(renovacion) : "—"}</td>
                            <td className="px-4 py-3 text-muted">{gastosFijos > 0 ? `− ${fmtMoney(gastosFijos)}` : "—"}</td>
                            <td className="px-4 py-3 text-right font-bold text-foreground">{fmtMoney(neto)}</td>
                            {/* Dato de volumen, no de ingreso — por eso
                                va apagado y fuera del neto. */}
                            <td className="px-4 py-3 text-right text-muted/70">{cobranza > 0 ? fmtMoney(cobranza) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
