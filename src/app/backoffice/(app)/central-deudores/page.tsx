import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getLatestCreditChecksGrouped, consultantLabel, type CreditCheckGrouped } from "@/lib/central-deudores";
import { SITUACION_LABELS, situacionColorClass } from "@/lib/bcra";
import { KpiStatCard } from "@/components/backoffice/KpiStatCard";
import { ResponsiveDataGrid } from "@/components/backoffice/ResponsiveDataGrid";
import { consultarCreditCheck } from "./actions";

const fmtDateTime = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

// Un solo badge para tarjetas móviles y tabla — cubre los 4 casos
// reales: sin antecedentes, situación actual informada, y "el BCRA lo
// conoce pero sin deuda actual" (solo histórico y/o cheques), que antes
// salía como "—" y parecía una consulta sin resultado.
function SituacionBadge({ c }: { c: CreditCheckGrouped }) {
  const extras = [
    c.peorHistorica !== null && c.peorHistorica > 1 && `histórico: peor situación ${c.peorHistorica}`,
    c.chequesRechazados > 0 && `${c.chequesRechazados} cheque${c.chequesRechazados === 1 ? "" : "s"} rechazado${c.chequesRechazados === 1 ? "" : "s"}`,
  ].filter(Boolean);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      {!c.found ? (
        <span className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
          Sin antecedentes
        </span>
      ) : c.situacionActual === null ? (
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${c.revisar ? situacionColorClass(2) : situacionColorClass(1)}`}>
          Sin deuda actual
        </span>
      ) : (
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${situacionColorClass(c.situacionActual)}`}>
          Situación {c.situacionActual} — {SITUACION_LABELS[c.situacionActual]}
        </span>
      )}
      {extras.length > 0 && <span className="text-[11px] text-muted">{extras.join(" · ")}</span>}
    </span>
  );
}

export default async function CentralDeDeudoresPage() {
  await requirePermission("central_deudores.consultar");
  const checks = await getLatestCreditChecksGrouped();

  // Métricas — dos grupos que particionan el total (ver evaluarCheck):
  // antes "sin antecedentes" y "situación > 1" dejaban afuera a los que
  // tienen datos en el BCRA pero todo en situación 1, y a los que no
  // tienen deuda actual pero sí histórico o cheques.
  const paraRevisar = checks.filter((c) => c.revisar).length;
  const limpios = checks.length - paraRevisar;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">Central de Deudores (BCRA)</h1>
        <p className="mt-1 max-w-2xl text-xs sm:text-sm text-muted leading-relaxed">
          Consulta la situación crediticia de un postulante a inquilino o garante antes de armar el contrato.
          Si la persona no tiene antecedentes en el BCRA, es un resultado normal.
        </p>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiStatCard
          title="Consultas CUIT"
          value={checks.length}
          subtitle="Personas o empresas evaluadas"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <KpiStatCard
          title="Sin Observaciones"
          value={limpios}
          subtitle="Sin antecedentes, o todo en situación 1 y sin cheques"
          badge={{ label: "Limpio", variant: "success" }}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiStatCard
          title="Para Revisar"
          value={paraRevisar}
          subtitle="Situación > 1 (actual o en 24 meses) o cheques rechazados"
          badge={{ label: paraRevisar > 0 ? "Revisar" : "Sin morosos", variant: paraRevisar > 0 ? "warning" : "neutral" }}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* Formulario de Consulta */}
      <form
        action={consultarCreditCheck}
        className="flex flex-col sm:flex-row sm:items-end gap-3 rounded-2xl border border-border/60 bg-surface p-5 shadow-xs"
      >
        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor="cuit" className="text-xs font-semibold uppercase tracking-wider text-muted">
            CUIT / CUIL del postulante (11 dígitos)
          </label>
          <input
            id="cuit"
            name="cuit"
            type="text"
            inputMode="numeric"
            placeholder="20304050607"
            required
            className="field w-full sm:w-72"
          />
        </div>
        <button
          type="submit"
          className="h-10 px-6 rounded-xl bg-accent text-xs font-bold uppercase tracking-wider text-accent-foreground hover:bg-accent-strong transition-all cursor-pointer shadow-sm shrink-0"
        >
          Consultar BCRA
        </button>
      </form>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Consultas Recientes</h2>
        <p className="text-xs text-muted/80 mt-0.5 mb-4">
          Muestra la consulta más reciente por CUIT. Las anteriores quedan archivadas en el historial.
        </p>

        {/* Grid Adaptativo (Tarjetas Móviles + Tabla Desktop) */}
        <ResponsiveDataGrid
          isEmpty={checks.length === 0}
          emptyMessage="Todavía no se hizo ninguna consulta de deudores."
          mobileCards={
            <>
              {checks.map((c) => (
                <div key={c.id} className="rounded-2xl border border-border/60 bg-surface p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3">
                    <div>
                      <Link
                        href={`/backoffice/central-deudores/${c.cuit}/${c.id}`}
                        className="font-mono font-bold text-accent hover:underline text-base block"
                      >
                        CUIT {c.cuit}
                      </Link>
                      <p className="text-xs font-medium text-foreground mt-0.5">{c.denominacion ?? "Denominación no disponible"}</p>
                    </div>
                  </div>

                  <div className="bg-background/50 p-3 rounded-xl border border-border/40">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider mb-1">Situación BCRA</span>
                    <SituacionBadge c={c} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Fecha</span>
                      <span className="font-semibold text-foreground">{fmtDateTime.format(c.consultedAt)}</span>
                    </div>
                    <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Consultado Por</span>
                      <span className="font-semibold text-foreground">{consultantLabel(c.consultedBy)}</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <Link
                      href={`/backoffice/central-deudores/${c.cuit}`}
                      className="flex h-10 w-full items-center justify-center rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-background transition-colors"
                    >
                      Ver Historial {c.totalConsultas > 1 && `(${c.totalConsultas} consultas)`}
                    </Link>
                  </div>
                </div>
              ))}
            </>
          }
          table={
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">CUIT/CUIL</th>
                  <th className="px-4 py-3">Nombre (AFIP)</th>
                  <th className="px-4 py-3">Situación</th>
                  <th className="px-4 py-3">Última consulta</th>
                  <th className="px-4 py-3">Por</th>
                  <th className="px-4 py-3">Historial</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 font-mono">
                      <Link href={`/backoffice/central-deudores/${c.cuit}/${c.id}`} className="font-bold text-accent hover:underline">
                        {c.cuit}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{c.denominacion ?? "—"}</td>
                    <td className="px-4 py-3">
                      <SituacionBadge c={c} />
                    </td>
                    <td className="px-4 py-3 text-muted">{fmtDateTime.format(c.consultedAt)}</td>
                    <td className="px-4 py-3 text-muted">{consultantLabel(c.consultedBy)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/backoffice/central-deudores/${c.cuit}`}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:bg-surface hover:text-foreground font-medium"
                      >
                        Ver historial {c.totalConsultas > 1 && `(${c.totalConsultas})`}
                      </Link>
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
