import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getCashMovements, getCashMovementTotals } from "@/lib/caja";
import { CajaTabs } from "@/components/backoffice/CajaTabs";
import type { CashMovementSource } from "@/generated/prisma/client";

const sourceLabels: Record<CashMovementSource, string> = {
  ADMINISTRACION: "Administración",
  COMISION_ALQUILER: "Comisión de alquiler",
  VENTA: "Venta",
  TASACION: "Tasación",
};

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  searchParams: Promise<{ source?: string }>;
}

export default async function CajaPage({ searchParams }: PageProps) {
  await requirePermission("caja.ver");
  const { source } = await searchParams;
  const sourceFilter = source && source in sourceLabels ? (source as CashMovementSource) : undefined;

  const [movements, totals] = await Promise.all([
    getCashMovements(sourceFilter ? { source: sourceFilter } : undefined),
    getCashMovementTotals(),
  ]);

  const totalsByCurrency = new Map<string, Map<CashMovementSource, number>>();
  for (const t of totals) {
    if (!totalsByCurrency.has(t.currency)) totalsByCurrency.set(t.currency, new Map());
    totalsByCurrency.get(t.currency)!.set(t.source, Number(t._sum.amount ?? 0));
  }

  return (
    <div>
      <CajaTabs active="movimientos" />
      <h1 className="mb-6 text-xl font-semibold text-foreground">Caja</h1>

      {totalsByCurrency.size > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[...totalsByCurrency.entries()].map(([currency, bySource]) => (
            <div key={currency} className="rounded-xl border border-border p-4 text-sm">
              <p className="mb-2 font-medium text-foreground">{currency}</p>
              <dl className="flex flex-col gap-1">
                {[...bySource.entries()].map(([src, amount]) => (
                  <div key={src} className="flex items-center justify-between">
                    <dt className="text-muted">{sourceLabels[src]}</dt>
                    <dd className="text-foreground">{fmtMoney(amount)}</dd>
                  </div>
                ))}
                <div className="mt-1 flex items-center justify-between border-t border-border pt-1">
                  <dt className="font-medium text-foreground">Total</dt>
                  <dd className="font-semibold text-foreground">
                    {fmtMoney([...bySource.values()].reduce((a, b) => a + b, 0))}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link
          href="/backoffice/caja"
          className={`rounded-full border px-3 py-1 ${!sourceFilter ? "border-accent text-accent" : "border-border text-muted hover:text-foreground"}`}
        >
          Todas
        </Link>
        {(Object.keys(sourceLabels) as CashMovementSource[]).map((src) => (
          <Link
            key={src}
            href={`/backoffice/caja?source=${src}`}
            className={`rounded-full border px-3 py-1 ${sourceFilter === src ? "border-accent text-accent" : "border-border text-muted hover:text-foreground"}`}
          >
            {sourceLabels[src]}
          </Link>
        ))}
      </div>

      {movements.length === 0 ? (
        <p className="text-sm text-muted">No hay movimientos cargados.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">{fmtDate.format(m.occurredAt)}</td>
                  <td className="px-4 py-3 text-muted">{sourceLabels[m.source]}</td>
                  <td className="px-4 py-3 text-foreground">{m.description}</td>
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
