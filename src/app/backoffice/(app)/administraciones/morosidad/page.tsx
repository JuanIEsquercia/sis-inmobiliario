import Link from "next/link";
import { getMoraChargesSummary, getOverduePayments, moraBucketFor } from "@/lib/alquileres";
import { requirePermission, getContractGroupScope } from "@/lib/auth";
import { AdministracionesTabs } from "@/components/backoffice/AdministracionesTabs";

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

const bucketOrder = ["1-3", "4-8", "9-15", "16-30", "30+"] as const;
const bucketLabels: Record<(typeof bucketOrder)[number], string> = {
  "1-3": "1 a 3 días",
  "4-8": "4 a 8 días",
  "9-15": "9 a 15 días",
  "16-30": "16 a 30 días",
  "30+": "Más de un mes",
};

export default async function MorosidadPage() {
  const profile = await requirePermission("administraciones.ver");
  const scope = await getContractGroupScope(profile);

  const [{ rows: moraRows, totalsByCurrency: moraTotals }, overdue] = await Promise.all([
    getMoraChargesSummary(scope),
    getOverduePayments(scope),
  ]);

  const bucketCounts: Record<(typeof bucketOrder)[number], number> = {
    "1-3": 0,
    "4-8": 0,
    "9-15": 0,
    "16-30": 0,
    "30+": 0,
  };
  for (const p of overdue) bucketCounts[moraBucketFor(p.daysLate)]++;

  const avgDays = overdue.length > 0 ? overdue.reduce((sum, p) => sum + p.daysLate, 0) / overdue.length : 0;

  const saldoByCurrency = new Map<string, number>();
  for (const p of overdue) saldoByCurrency.set(p.currency, (saldoByCurrency.get(p.currency) ?? 0) + p.saldo);

  return (
    <div>
      <AdministracionesTabs active="morosidad" />
      <h1 className="mb-2 text-xl font-semibold text-foreground">Morosidad</h1>
      <p className="mb-6 text-sm text-muted">
        Seguimiento de atrasos vigentes y de los intereses por mora cargados a lo largo del tiempo.
      </p>

      {/* Seguimiento de atrasos actuales */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium text-foreground">Atrasos vigentes</h2>

        <div className="mb-4 flex flex-wrap gap-3">
          {bucketOrder.map((bucket) => (
            <div key={bucket} className="rounded-xl border border-border px-4 py-3 text-sm">
              <span className="text-muted">{bucketLabels[bucket]}</span>{" "}
              <span className="font-semibold text-foreground">{bucketCounts[bucket]}</span>
            </div>
          ))}
          <div className="rounded-xl border border-border px-4 py-3 text-sm">
            <span className="text-muted">Promedio de días de mora</span>{" "}
            <span className="font-semibold text-foreground">{avgDays.toFixed(1)}</span>
          </div>
          {[...saldoByCurrency.entries()].map(([currency, total]) => (
            <div key={currency} className="rounded-xl border border-border px-4 py-3 text-sm">
              <span className="text-muted">Adeudado {currency}</span>{" "}
              <span className="font-semibold text-foreground">{fmtMoney(total)}</span>
            </div>
          ))}
        </div>

        {overdue.length === 0 ? (
          <p className="text-sm text-muted">No hay liquidaciones vencidas sin cobrar.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Inquilino</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3">Saldo</th>
                  <th className="px-4 py-3">Días de mora</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((p) => (
                  <tr key={p.paymentId} className="border-b border-border last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 text-muted">{p.propertyCode}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/backoffice/administraciones/${p.contractId}/liquidaciones/${p.paymentId}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {p.address}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{p.tenantName}</td>
                    <td className="px-4 py-3 text-muted">
                      {monthNames[p.periodMonth - 1]} {p.periodYear}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {p.currency} {fmtMoney(p.saldo)}
                    </td>
                    <td className="px-4 py-3 text-foreground">{p.daysLate} días</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Intereses por mora cargados */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground">Intereses por mora cargados</h2>

        {moraRows.length === 0 ? (
          <p className="text-sm text-muted">Todavía no se cargó mora en ninguna liquidación.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-3">
              {[...moraTotals.entries()].map(([currency, total]) => (
                <div key={currency} className="rounded-xl border border-border px-4 py-3 text-sm">
                  <span className="text-muted">Total {currency}</span>{" "}
                  <span className="font-semibold text-foreground">{fmtMoney(total)}</span>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Inquilino</th>
                    <th className="px-4 py-3">Meses con mora</th>
                    <th className="px-4 py-3">Total cargado</th>
                  </tr>
                </thead>
                <tbody>
                  {moraRows.map((r) => (
                    <tr key={r.contractId} className="border-b border-border last:border-0 hover:bg-surface">
                      <td className="px-4 py-3 text-muted">{r.propertyCode}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/backoffice/administraciones/${r.contractId}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {r.address}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{r.tenantName}</td>
                      <td className="px-4 py-3 text-muted">{r.periods}</td>
                      <td className="px-4 py-3 text-foreground">
                        {r.currency} {fmtMoney(r.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
