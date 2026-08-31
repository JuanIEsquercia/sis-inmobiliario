import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getMonthlyCashSummary } from "@/lib/caja";
import { CajaTabs } from "@/components/backoffice/CajaTabs";
import type { CashMovementSource } from "@/generated/prisma/client";

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const sourceLabels: Record<CashMovementSource, string> = {
  ADMINISTRACION: "Administración",
  COMISION_ALQUILER: "Comisión de alquiler",
  COMISION_RENOVACION: "Comisión de renovación",
  VENTA: "Venta",
  TASACION: "Tasación",
};

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  searchParams: Promise<{ mes?: string; anio?: string }>;
}

export default async function ConsolidadoPage({ searchParams }: PageProps) {
  await requirePermission("caja.ver");
  const sp = await searchParams;

  const now = new Date();
  const month = Number(sp.mes) || now.getUTCMonth() + 1;
  const year = Number(sp.anio) || now.getUTCFullYear();

  const { movements, expenses, agentPayments } = await getMonthlyCashSummary(month, year);

  function periodHref(m: number, y: number) {
    return `/backoffice/caja/consolidado?mes=${m}&anio=${y}`;
  }
  const prev = month === 1 ? { m: 12, y: year - 1 } : { m: month - 1, y: year };
  const next = month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year };

  // Nunca se suma ARS con USD — todo se acumula por moneda.
  const ingresosByCurrency = new Map<string, number>();
  const ingresosBySource = new Map<string, number>(); // key `${source}|${currency}`
  for (const m of movements) {
    ingresosByCurrency.set(m.currency, (ingresosByCurrency.get(m.currency) ?? 0) + Number(m.amount));
    const key = `${m.source}|${m.currency}`;
    ingresosBySource.set(key, (ingresosBySource.get(key) ?? 0) + Number(m.amount));
  }

  const egresosByCurrency = new Map<string, number>();
  const egresosByCategory = new Map<string, number>(); // key `${categoryName}|${currency}`
  for (const e of expenses) {
    egresosByCurrency.set(e.currency, (egresosByCurrency.get(e.currency) ?? 0) + Number(e.amount));
    const key = `${e.category.name}|${e.currency}`;
    egresosByCategory.set(key, (egresosByCategory.get(key) ?? 0) + Number(e.amount));
  }

  const agentesByCurrency = new Map<string, number>();
  for (const p of agentPayments) {
    agentesByCurrency.set(p.currency, (agentesByCurrency.get(p.currency) ?? 0) + Number(p.amount));
    egresosByCurrency.set(p.currency, (egresosByCurrency.get(p.currency) ?? 0) + Number(p.amount));
  }

  const currencies = new Set([...ingresosByCurrency.keys(), ...egresosByCurrency.keys()]);

  return (
    <div>
      <CajaTabs active="consolidado" />
      <h1 className="mb-1 text-xl font-semibold text-foreground">Consolidado mensual</h1>
      <p className="mb-6 text-sm text-muted">Ingresos reales menos egresos reales del mes — el neto de verdad.</p>

      <div className="mb-6 flex items-center gap-3">
        <Link href={periodHref(prev.m, prev.y)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface">
          ← Anterior
        </Link>
        <span className="text-sm font-medium text-foreground">
          {monthNames[month - 1]} {year}
        </span>
        <Link href={periodHref(next.m, next.y)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface">
          Siguiente →
        </Link>
      </div>

      {currencies.size === 0 ? (
        <p className="text-sm text-muted">No hay movimientos ni gastos cargados este mes.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {[...currencies].sort().map((currency) => {
            const ingresos = ingresosByCurrency.get(currency) ?? 0;
            const egresos = egresosByCurrency.get(currency) ?? 0;
            const neto = ingresos - egresos;
            return (
              <div key={currency} className="rounded-xl border border-border p-5">
                <h2 className="mb-4 text-sm font-semibold text-foreground">{currency}</h2>

                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Ingresos</p>
                <dl className="mb-4 flex flex-col gap-1 text-sm">
                  {[...ingresosBySource.entries()]
                    .filter(([key]) => key.endsWith(`|${currency}`))
                    .map(([key, total]) => (
                      <div key={key} className="flex items-center justify-between">
                        <dt className="text-muted">{sourceLabels[key.split("|")[0] as CashMovementSource]}</dt>
                        <dd className="text-foreground">{fmtMoney(total)}</dd>
                      </div>
                    ))}
                  {ingresos === 0 && <p className="text-muted">Sin ingresos este mes.</p>}
                  <div className="mt-1 flex items-center justify-between border-t border-border pt-1 font-medium">
                    <dt className="text-foreground">Total ingresos</dt>
                    <dd className="text-foreground">{fmtMoney(ingresos)}</dd>
                  </div>
                </dl>

                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Egresos</p>
                <dl className="mb-4 flex flex-col gap-1 text-sm">
                  {[...egresosByCategory.entries()]
                    .filter(([key]) => key.endsWith(`|${currency}`))
                    .map(([key, total]) => (
                      <div key={key} className="flex items-center justify-between">
                        <dt className="text-muted">{key.split("|")[0]}</dt>
                        <dd className="text-foreground">{fmtMoney(total)}</dd>
                      </div>
                    ))}
                  {agentesByCurrency.has(currency) && (
                    <div className="flex items-center justify-between">
                      <dt className="text-muted">Pagos a agentes</dt>
                      <dd className="text-foreground">{fmtMoney(agentesByCurrency.get(currency)!)}</dd>
                    </div>
                  )}
                  {egresos === 0 && <p className="text-muted">Sin egresos este mes.</p>}
                  <div className="mt-1 flex items-center justify-between border-t border-border pt-1 font-medium">
                    <dt className="text-foreground">Total egresos</dt>
                    <dd className="text-foreground">{fmtMoney(egresos)}</dd>
                  </div>
                </dl>

                <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                  <span className="text-sm font-semibold text-foreground">Neto</span>
                  <span className={`text-lg font-bold ${neto >= 0 ? "text-foreground" : "text-accent"}`}>
                    {fmtMoney(neto)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
