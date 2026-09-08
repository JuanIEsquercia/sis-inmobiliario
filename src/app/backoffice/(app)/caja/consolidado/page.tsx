import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getMonthlyCashSummary, getCashSummaryByRange } from "@/lib/caja";
import { CajaTabs } from "@/components/backoffice/CajaTabs";
import { CustomMonthPicker } from "@/components/backoffice/CustomMonthPicker";
import { KpiStatCard } from "@/components/backoffice/KpiStatCard";
import type { CashMovementSource } from "@/generated/prisma/client";

const sourceLabels: Record<CashMovementSource, string> = {
  ADMINISTRACION: "Administración",
  COMISION_ALQUILER: "Comisión de alquiler",
  COMISION_RENOVACION: "Comisión de renovación",
  VENTA: "Venta",
  TASACION: "Tasación",
};

const monthAbbr = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

type Vista = "mensual" | "semestral" | "anual";

interface PageProps {
  searchParams: Promise<{ vista?: string; mes?: string; anio?: string; semestre?: string }>;
}

function viewHref(vista: Vista, anio: number, extra?: Record<string, string | number>): string {
  const params = new URLSearchParams({ vista: vista, anio: String(anio) });
  for (const [k, v] of Object.entries(extra ?? {})) params.set(k, String(v));
  return `/backoffice/caja/consolidado?${params.toString()}`;
}

export default async function ConsolidadoPage({ searchParams }: PageProps) {
  await requirePermission("caja.consolidado.ver");
  const sp = await searchParams;

  const now = new Date();
  const vista: Vista = sp.vista === "semestral" || sp.vista === "anual" ? sp.vista : "mensual";
  const year = Number(sp.anio) || now.getUTCFullYear();

  return (
    <div>
      <CajaTabs active="consolidado" />
      <h1 className="mb-1 text-xl font-semibold text-foreground">Consolidado</h1>
      <p className="mb-6 text-sm text-muted">Ingresos reales menos egresos reales — el neto de verdad.</p>

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-surface p-1.5 shadow-sm w-fit">
        {(["mensual", "semestral", "anual"] as const).map((v) => (
          <Link
            key={v}
            href={
              v === "mensual"
                ? `/backoffice/caja/consolidado?vista=mensual&mes=${now.getUTCMonth() + 1}&anio=${now.getUTCFullYear()}`
                : viewHref(v, year, v === "semestral" ? { semestre: year === now.getUTCFullYear() ? Math.floor(now.getUTCMonth() / 6) + 1 : 1 } : {})
            }
            className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
              vista === v ? "bg-accent text-accent-foreground shadow-sm" : "text-muted hover:bg-background hover:text-foreground"
            }`}
          >
            {v === "mensual" ? "Mensual" : v === "semestral" ? "Semestral" : "Anual"}
          </Link>
        ))}
      </div>

      {vista === "mensual" && <VistaMensual sp={sp} now={now} />}
      {vista === "semestral" && <VistaRango year={year} semestre={sp.semestre === "2" ? 2 : 1} tipo="semestral" />}
      {vista === "anual" && <VistaRango year={year} tipo="anual" />}
    </div>
  );
}

async function VistaMensual({ sp, now }: { sp: { mes?: string; anio?: string }; now: Date }) {
  const month = Number(sp.mes) || now.getUTCMonth() + 1;
  const year = Number(sp.anio) || now.getUTCFullYear();

  const { movements, expenses, agentPayments } = await getMonthlyCashSummary(month, year);

  const ingresosByCurrency = new Map<string, number>();
  const ingresosBySource = new Map<string, number>();
  for (const m of movements) {
    ingresosByCurrency.set(m.currency, (ingresosByCurrency.get(m.currency) ?? 0) + Number(m.amount));
    const key = `${m.source}|${m.currency}`;
    ingresosBySource.set(key, (ingresosBySource.get(key) ?? 0) + Number(m.amount));
  }

  const egresosByCurrency = new Map<string, number>();
  const egresosByCategory = new Map<string, number>();
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
      <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-surface p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Período:</span>
          <CustomMonthPicker month={month} year={year} basePath="/backoffice/caja/consolidado" />
        </div>
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

// Semestral y Anual comparten la misma forma: tendencia mes a mes, no
// un solo total tapando el período — para poder comparar meses entre
// sí y sumar rangos propios a ojo, que es justo lo que el mes a mes no
// permitía. Cada fila de mes linkea a su detalle completo (Vista
// Mensual, por fuente/categoría) para el que quiera profundizar.
async function VistaRango({ year, semestre, tipo }: { year: number; semestre?: 1 | 2; tipo: "semestral" | "anual" }) {
  const startMonth = tipo === "semestral" ? (semestre === 2 ? 7 : 1) : 1;
  const monthsCount = tipo === "semestral" ? 6 : 12;

  const lines = await getCashSummaryByRange(year, startMonth, monthsCount);

  const currencies = new Set<string>();
  for (const line of lines) {
    for (const c of line.ingresosByCurrency.keys()) currencies.add(c);
    for (const c of line.egresosByCurrency.keys()) currencies.add(c);
  }

  const totalsByCurrency = new Map<string, { ingresos: number; egresos: number }>();
  for (const currency of currencies) {
    let ingresos = 0;
    let egresos = 0;
    for (const line of lines) {
      ingresos += line.ingresosByCurrency.get(currency) ?? 0;
      egresos += line.egresosByCurrency.get(currency) ?? 0;
    }
    totalsByCurrency.set(currency, { ingresos, egresos });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-surface p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href={viewHref(tipo, year - 1, tipo === "semestral" ? { semestre: semestre! } : {})}
            aria-label="Año anterior"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 text-muted transition-colors hover:bg-accent-soft/40 hover:text-accent"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-base font-extrabold text-foreground tracking-tight">
            {tipo === "semestral" ? `${semestre === 2 ? "2do" : "1er"} semestre ${year}` : year}
          </span>
          <Link
            href={viewHref(tipo, year + 1, tipo === "semestral" ? { semestre: semestre! } : {})}
            aria-label="Año siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 text-muted transition-colors hover:bg-accent-soft/40 hover:text-accent"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        {tipo === "semestral" && (
          <div className="flex items-center gap-1.5">
            {([1, 2] as const).map((s) => (
              <Link
                key={s}
                href={viewHref("semestral", year, { semestre: s })}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  semestre === s ? "bg-accent text-accent-foreground" : "border border-border/60 text-muted hover:bg-background"
                }`}
              >
                {s === 1 ? "Ene—Jun" : "Jul—Dic"}
              </Link>
            ))}
          </div>
        )}
      </div>

      {currencies.size === 0 ? (
        <p className="text-sm text-muted">No hay movimientos ni gastos cargados en este período.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {[...currencies].sort().map((currency) => {
            const totals = totalsByCurrency.get(currency)!;
            const neto = totals.ingresos - totals.egresos;
            return (
              <div key={currency}>
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <KpiStatCard title={`Ingresos (${currency})`} value={fmtMoney(totals.ingresos)} />
                  <KpiStatCard title={`Egresos (${currency})`} value={fmtMoney(totals.egresos)} />
                  <KpiStatCard
                    title={`Neto (${currency})`}
                    value={fmtMoney(neto)}
                    badge={neto >= 0 ? { label: "Positivo", variant: "success" } : { label: "Negativo", variant: "danger" }}
                  />
                </div>

                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                        <th className="px-4 py-3">Mes</th>
                        <th className="px-4 py-3 text-right">Ingresos</th>
                        <th className="px-4 py-3 text-right">Egresos</th>
                        <th className="px-4 py-3 text-right">Neto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => {
                        const ing = line.ingresosByCurrency.get(currency) ?? 0;
                        const egr = line.egresosByCurrency.get(currency) ?? 0;
                        const lineNeto = ing - egr;
                        return (
                          <tr key={`${line.year}-${line.month}`} className="border-b border-border last:border-0 hover:bg-surface">
                            <td className="px-4 py-2.5">
                              <Link
                                href={`/backoffice/caja/consolidado?vista=mensual&mes=${line.month}&anio=${line.year}`}
                                className="font-medium text-accent hover:underline"
                              >
                                {monthAbbr[line.month - 1]} {line.year}
                              </Link>
                            </td>
                            <td className="px-4 py-2.5 text-right text-foreground">{fmtMoney(ing)}</td>
                            <td className="px-4 py-2.5 text-right text-foreground">{fmtMoney(egr)}</td>
                            <td className={`px-4 py-2.5 text-right font-semibold ${lineNeto >= 0 ? "text-foreground" : "text-accent"}`}>
                              {fmtMoney(lineNeto)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-surface/60 font-bold">
                        <td className="px-4 py-2.5 text-foreground">Total {tipo === "semestral" ? "semestre" : "año"}</td>
                        <td className="px-4 py-2.5 text-right text-foreground">{fmtMoney(totals.ingresos)}</td>
                        <td className="px-4 py-2.5 text-right text-foreground">{fmtMoney(totals.egresos)}</td>
                        <td className={`px-4 py-2.5 text-right ${neto >= 0 ? "text-foreground" : "text-accent"}`}>{fmtMoney(neto)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
