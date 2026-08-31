import { requirePermission } from "@/lib/auth";
import { getProjection, getProjectionSettings } from "@/lib/caja";
import { CajaTabs } from "@/components/backoffice/CajaTabs";
import { guardarProjectionSettings } from "../actions";

const monthNames = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

const MONTHS_AHEAD = 6;

export default async function ProyeccionPage() {
  const profile = await requirePermission("caja.ver");
  const canConfigure = profile.permissions.includes("caja.proyeccion.configurar");

  const [months, settings] = await Promise.all([getProjection(MONTHS_AHEAD), getProjectionSettings()]);

  const currencies = new Set<string>();
  for (const m of months) {
    for (const c of m.alquileresByCurrency.keys()) currencies.add(c);
    for (const c of m.renovacionesByCurrency.keys()) currencies.add(c);
    for (const c of m.gastosFijosByCurrency.keys()) currencies.add(c);
  }

  return (
    <div>
      <CajaTabs active="proyeccion" />
      <h1 className="mb-1 text-xl font-semibold text-foreground">Proyección financiera</h1>
      <p className="mb-6 text-sm text-muted">
        Proyección plana de los próximos {MONTHS_AHEAD} meses — solo lo predecible: alquileres ya pactados,
        comisión de renovación de los contratos marcados &quot;Sí&quot;, y gastos fijos al último monto cargado.
        Ventas, Tasaciones y gastos variables no se proyectan: dependen de nuevos cierres, no hay un patrón del
        que estimar sin inventar un supuesto.
      </p>

      <section className="mb-8 rounded-xl border border-dashed border-border p-4">
        <h2 className="mb-3 text-sm font-medium text-foreground">Banda de corrección por indexación</h2>
        <p className="mb-3 text-xs text-muted">
          El monto de alquileres proyectado usa el valor vigente hoy, sin anticipar aumentos por indexación
          todavía no aplicados. Este rango es tu estimación de cuánto suele terminar siendo mayor en la
          realidad — se muestra al lado del total proyectado, no lo reemplaza.
        </p>
        {canConfigure ? (
          <form action={guardarProjectionSettings} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="min" className="text-xs text-muted">
                % mínimo
              </label>
              <input
                id="min"
                name="indexationCorrectionMinPercent"
                type="number"
                step="0.1"
                required
                defaultValue={settings.indexationCorrectionMinPercent}
                className="field w-24"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="max" className="text-xs text-muted">
                % máximo
              </label>
              <input
                id="max"
                name="indexationCorrectionMaxPercent"
                type="number"
                step="0.1"
                required
                defaultValue={settings.indexationCorrectionMaxPercent}
                className="field w-24"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
            >
              Guardar
            </button>
          </form>
        ) : (
          <p className="text-sm text-foreground">
            {settings.indexationCorrectionMinPercent}% – {settings.indexationCorrectionMaxPercent}%
          </p>
        )}
      </section>

      {currencies.size === 0 ? (
        <p className="text-sm text-muted">No hay alquileres vigentes ni gastos fijos para proyectar.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {[...currencies].sort().map((currency) => (
            <div key={currency}>
              <h2 className="mb-3 text-sm font-semibold text-foreground">{currency}</h2>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                      <th className="px-4 py-3">Mes</th>
                      <th className="px-4 py-3">Alquileres proyectado</th>
                      <th className="px-4 py-3">Estimado real (+{settings.indexationCorrectionMinPercent}/+{settings.indexationCorrectionMaxPercent}%)</th>
                      <th className="px-4 py-3">Comisión renovación</th>
                      <th className="px-4 py-3">Gastos fijos</th>
                      <th className="px-4 py-3">Neto proyectado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m) => {
                      const alquileres = m.alquileresByCurrency.get(currency) ?? 0;
                      const renovacion = m.renovacionesByCurrency.get(currency) ?? 0;
                      const gastosFijos = m.gastosFijosByCurrency.get(currency) ?? 0;
                      const neto = alquileres + renovacion - gastosFijos;
                      const bandaMin = alquileres * (1 + settings.indexationCorrectionMinPercent / 100);
                      const bandaMax = alquileres * (1 + settings.indexationCorrectionMaxPercent / 100);
                      return (
                        <tr key={`${m.year}-${m.month}`} className="border-b border-border last:border-0 hover:bg-surface">
                          <td className="px-4 py-3 text-muted">
                            {monthNames[m.month - 1]} {m.year}
                          </td>
                          <td className="px-4 py-3 text-foreground">{fmtMoney(alquileres)}</td>
                          <td className="px-4 py-3 text-muted">
                            {alquileres > 0 ? `${fmtMoney(bandaMin)} – ${fmtMoney(bandaMax)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted">{renovacion > 0 ? fmtMoney(renovacion) : "—"}</td>
                          <td className="px-4 py-3 text-muted">{gastosFijos > 0 ? `− ${fmtMoney(gastosFijos)}` : "—"}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{fmtMoney(neto)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
