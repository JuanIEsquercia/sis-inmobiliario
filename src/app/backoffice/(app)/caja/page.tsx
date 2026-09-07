import { requirePermission } from "@/lib/auth";
import { getCashMovements, getCashMovementTotals } from "@/lib/caja";
import { CajaTabs } from "@/components/backoffice/CajaTabs";
import { ResponsiveDataGrid } from "@/components/backoffice/ResponsiveDataGrid";
import type { CashMovementSource } from "@/generated/prisma/client";

const sourceLabels: Record<CashMovementSource, string> = {
  ADMINISTRACION: "Administración",
  COMISION_ALQUILER: "Comisión de alquiler",
  COMISION_RENOVACION: "Comisión de renovación",
  VENTA: "Venta",
  TASACION: "Tasación",
};

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

export default async function CajaPage() {
  await requirePermission("caja.ver");

  const [movements, totals] = await Promise.all([getCashMovements(), getCashMovementTotals()]);

  const totalsByCurrency = new Map<string, Map<CashMovementSource, number>>();
  for (const t of totals) {
    if (!totalsByCurrency.has(t.currency)) totalsByCurrency.set(t.currency, new Map());
    totalsByCurrency.get(t.currency)!.set(t.source, Number(t._sum.amount ?? 0));
  }

  return (
    <div className="space-y-6">
      <CajaTabs active="movimientos" />

      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">Movimientos de Caja</h1>
        <p className="text-xs text-muted mt-1">Resumen general de ingresos, comisiones y movimientos de caja central</p>
      </div>

      {/* Totales Resumidos por Moneda */}
      {totalsByCurrency.size > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[...totalsByCurrency.entries()].map(([currency, bySource]) => {
            const grandTotal = [...bySource.values()].reduce((a, b) => a + b, 0);
            return (
              <div key={currency} className="rounded-2xl border border-border/60 bg-surface p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <span className="font-mono font-extrabold text-lg text-accent">{currency}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Totales Acumulados</span>
                </div>
                <dl className="flex flex-col gap-2 text-xs">
                  {[...bySource.entries()].map(([src, amount]) => (
                    <div key={src} className="flex items-center justify-between py-0.5">
                      <dt className="text-muted font-medium">{sourceLabels[src]}</dt>
                      <dd className="text-foreground font-semibold">{currency} {fmtMoney(amount)}</dd>
                    </div>
                  ))}
                  <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-2.5">
                    <dt className="font-bold text-foreground text-sm">Total General</dt>
                    <dd className="font-extrabold text-foreground text-sm">
                      {currency} {fmtMoney(grandTotal)}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid Adaptativo (Tarjetas Móviles + Tabla Desktop) */}
      <ResponsiveDataGrid
        isEmpty={movements.length === 0}
        emptyMessage="No hay movimientos cargados."
        mobileCards={
          <>
            {movements.map((m) => (
              <div key={m.id} className="rounded-2xl border border-border/60 bg-surface p-4 shadow-sm space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-sm">{m.description}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-lg">
                      {sourceLabels[m.source]}
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
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">{fmtDate.format(m.occurredAt)}</td>
                  <td className="px-4 py-3 text-muted">{sourceLabels[m.source]}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{m.description}</td>
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
  );
}
