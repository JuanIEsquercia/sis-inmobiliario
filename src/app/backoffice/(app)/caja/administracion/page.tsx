import { requirePermission } from "@/lib/auth";
import { getCashMovements } from "@/lib/caja";
import { getPaymentsPendingFeeConfirmation, paymentBreakdown } from "@/lib/alquileres";
import { CajaTabs } from "@/components/backoffice/CajaTabs";
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
    <div>
      <CajaTabs active="administracion" />
      <h1 className="mb-1 text-xl font-semibold text-foreground">Administración</h1>
      <p className="mb-6 text-sm text-muted">
        Ingreso por el % de administración de cada liquidación mensual — separado de que el inquilino haya pagado:
        recién se suma a la Caja cuando se confirma que la inmobiliaria tiene esa plata en mano, porque muchas veces
        difiere (ej. el inquilino transfiere directo al propietario).
      </p>

      {canConfirmar && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-foreground">Pendientes de confirmar cobro</h2>
          {pendientes.length === 0 ? (
            <p className="text-sm text-muted">No hay comisiones pagadas por el inquilino esperando confirmación.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3">Período</th>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Propietario</th>
                    <th className="px-4 py-3">Comisión</th>
                    <th className="px-4 py-3">Confirmar</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map((p) => {
                    const { managementFee } = paymentBreakdown(p.items, p.contract.managementFeePercent);
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                        <td className="px-4 py-3 text-muted">
                          {monthNames[p.periodMonth - 1]} {p.periodYear}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {p.contract.unit.propertyCode} — {p.contract.unit.address}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {p.contract.owner.firstName} {p.contract.owner.lastName}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {p.currency} {fmtMoney(managementFee)}
                        </td>
                        <td className="px-4 py-3">
                          <form action={confirmarCobroComision.bind(null, p.id)} className="flex items-center gap-1.5">
                            <select name="method" defaultValue="TRANSFERENCIA" className="field py-1 text-xs" required>
                              <option value="EFECTIVO">Efectivo</option>
                              <option value="TRANSFERENCIA">Transferencia</option>
                            </select>
                            <button
                              type="submit"
                              className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface"
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
            </div>
          )}
        </section>
      )}

      {totalsByCurrency.size > 0 && (
        <div className="mb-6 flex flex-wrap gap-4">
          {[...totalsByCurrency.entries()].map(([currency, total]) => (
            <div key={currency} className="rounded-xl border border-border px-4 py-3 text-sm">
              <span className="text-muted">Total {currency}</span>{" "}
              <span className="font-semibold text-foreground">{fmtMoney(total)}</span>
            </div>
          ))}
        </div>
      )}

      {movements.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay ingresos de administración confirmados.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Medio</th>
                <th className="px-4 py-3">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">{fmtDate.format(m.occurredAt)}</td>
                  <td className="px-4 py-3 text-foreground">{m.description}</td>
                  <td className="px-4 py-3 text-muted">{m.method ? methodLabels[m.method] : "—"}</td>
                  <td className="px-4 py-3 text-foreground">
                    {m.currency} {fmtMoney(Number(m.amount))}
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
