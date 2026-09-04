import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getLatestCreditChecksGrouped, consultantLabel } from "@/lib/central-deudores";
import { SITUACION_LABELS, situacionColorClass } from "@/lib/bcra";
import { consultarCreditCheck } from "./actions";

const fmtDateTime = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

export default async function CentralDeDeudoresPage() {
  await requirePermission("administraciones.crear");
  const checks = await getLatestCreditChecksGrouped();

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-foreground">Central de Deudores (BCRA)</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Consultá la situación crediticia de un postulante a inquilino o garante antes de armar el contrato — sirve
        para mandarle al propietario un informe con el que evaluar la viabilidad. Se consulta por CUIT/CUIL; si la
        persona no tiene antecedentes en el BCRA, es un resultado normal, no un error.
      </p>

      <form action={consultarCreditCheck} className="mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface/30 p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cuit" className="text-xs text-muted">
            CUIT / CUIL del postulante (11 dígitos)
          </label>
          <input
            id="cuit"
            name="cuit"
            type="text"
            inputMode="numeric"
            placeholder="20304050607"
            required
            className="field w-56"
          />
        </div>
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong">
          Consultar
        </button>
      </form>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Consultas recientes</h2>
      <p className="mb-3 text-xs text-muted">
        Una fila por CUIT (la consulta más reciente) — cada consulta anterior queda guardada, entrá a &quot;Historial&quot;
        para verlas todas.
      </p>
      {checks.length === 0 ? (
        <p className="text-sm text-muted">Todavía no se hizo ninguna consulta.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
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
                  <td className="px-4 py-3 font-mono text-muted">
                    <Link href={`/backoffice/central-deudores/${c.cuit}/${c.id}`} className="font-medium text-foreground hover:underline">
                      {c.cuit}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{c.denominacion ?? "—"}</td>
                  <td className="px-4 py-3">
                    {!c.found ? (
                      <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted">Sin antecedentes</span>
                    ) : c.situacionActual === null ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${situacionColorClass(c.situacionActual)}`}>
                        Situación {c.situacionActual} — {SITUACION_LABELS[c.situacionActual]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{fmtDateTime.format(c.consultedAt)}</td>
                  <td className="px-4 py-3 text-muted">{consultantLabel(c.consultedBy)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/backoffice/central-deudores/${c.cuit}`}
                      className="rounded-lg border border-border px-2 py-1 text-xs text-muted hover:bg-surface hover:text-foreground"
                    >
                      Ver historial {c.totalConsultas > 1 && `(${c.totalConsultas})`}
                    </Link>
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
