import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import {
  getCreditCheckByCuit,
  ultimoPeriodo,
  totalChequesRechazados,
  consultantLabel,
  groupHistoricoByEntidad,
} from "@/lib/central-deudores";
import { SITUACION_LABELS, SITUACION_DETAIL, situacionColorClass, situacionRowClass, type DeudaResult, type ChequesResult } from "@/lib/bcra";
import { consultarCreditCheck } from "../actions";

const fmtDateTime = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });
const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

function periodoLabel(periodo: string): string {
  // AAAAMM -> "MM/AAAA"
  if (!/^\d{6}$/.test(periodo)) return periodo;
  return `${periodo.slice(4)}/${periodo.slice(0, 4)}`;
}

interface PageProps {
  params: Promise<{ cuit: string }>;
}

export default async function CreditCheckDetailPage({ params }: PageProps) {
  await requirePermission("administraciones.crear");
  const { cuit } = await params;

  const check = await getCreditCheckByCuit(cuit);
  if (!check) notFound();

  // Guardados por nosotros mismos en consultarCreditCheck a partir de la
  // respuesta cruda del BCRA — el shape ya está validado en ese punto.
  const deuda = check.deudaData as unknown as DeudaResult | null;
  const historico = check.historicoData as unknown as DeudaResult | null;
  const cheques = check.chequesRechazadosData as unknown as ChequesResult | null;
  const periodoActual = ultimoPeriodo(deuda);
  const cantidadCheques = totalChequesRechazados(cheques);
  const historicoPorBanco = groupHistoricoByEntidad(historico);

  return (
    <div>
      <Link href="/backoffice/central-deudores" className="mb-4 inline-block text-sm text-muted hover:underline">
        ← Volver a Central de Deudores
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{check.denominacion ?? "Sin denominación AFIP"}</h1>
          <p className="font-mono text-sm text-muted">CUIT/CUIL {check.cuit}</p>
        </div>
        <div className="flex items-center gap-2">
          <form action={consultarCreditCheck}>
            <input type="hidden" name="cuit" value={check.cuit} />
            <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:bg-surface hover:text-foreground">
              Volver a consultar
            </button>
          </form>
          <Link
            href={`/backoffice/central-deudores/${check.cuit}/imprimir`}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
          >
            Exportar PDF
          </Link>
        </div>
      </div>

      <p className="mb-6 text-xs text-muted">
        Consultado el {fmtDateTime.format(check.consultedAt)} por {consultantLabel(check.consultedBy)}.
      </p>

      {!check.found ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-emerald-700">
          Sin antecedentes en el BCRA — no figura deuda, historial de atrasos ni cheques rechazados para este
          CUIT/CUIL.
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Situación actual */}
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
              Situación actual {periodoActual && `— período ${periodoLabel(periodoActual.periodo)}`}
            </h2>
            {!periodoActual || periodoActual.entidades.length === 0 ? (
              <p className="text-sm text-muted">Sin deuda informada en el sistema financiero.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                      <th className="px-4 py-3">Entidad</th>
                      <th className="px-4 py-3">Situación</th>
                      <th className="px-4 py-3">Monto (miles $)</th>
                      <th className="px-4 py-3">Días atraso</th>
                      <th className="px-4 py-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodoActual.entidades.map((e, i) => {
                      const flags = [
                        e.refinanciaciones && "Refinanciación",
                        e.recategorizacionOblig && "Recategorización obligatoria",
                        e.situacionJuridica && "Situación jurídica",
                        e.irrecDisposicionTecnica && "Irrecuperable por disp. técnica",
                        e.enRevision && "En revisión",
                        e.procesoJud && "Proceso judicial",
                      ].filter(Boolean);
                      return (
                        <tr
                          key={`${e.entidad}-${i}`}
                          className={`border-b border-border last:border-0 hover:bg-surface ${situacionRowClass(e.situacion)}`}
                        >
                          <td className="px-4 py-3 text-foreground">{e.entidad}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${situacionColorClass(e.situacion)}`}>
                              {e.situacion} — {SITUACION_LABELS[e.situacion] ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted">{fmtMoney(e.monto)}</td>
                          <td className="px-4 py-3 text-muted">{e.diasAtrasoPago ?? 0}</td>
                          <td className="px-4 py-3 text-xs text-muted">{flags.length ? flags.join(", ") : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Histórico 24 meses — agrupado por banco, no por período, así
              se sigue la evolución de cada entidad de un vistazo */}
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">Histórico (24 meses)</h2>
            {historicoPorBanco.length === 0 ? (
              <p className="text-sm text-muted">Sin historial informado.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {historicoPorBanco.map((banco) => (
                  <div key={banco.entidad} className="overflow-x-auto rounded-xl border border-border">
                    <div className="flex items-center justify-between border-b border-border bg-surface/40 px-4 py-2.5">
                      <span className="text-sm font-semibold text-foreground">{banco.entidad}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${situacionColorClass(banco.peorSituacion)}`}>
                        Peor situación: {banco.peorSituacion}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                          <th className="px-4 py-2.5">Período</th>
                          <th className="px-4 py-2.5">Situación</th>
                          <th className="px-4 py-2.5">Monto (miles $)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {banco.periodos.map((p) => (
                          <tr key={p.periodo} className={`border-b border-border last:border-0 hover:bg-surface ${situacionRowClass(p.situacion)}`}>
                            <td className="px-4 py-2.5 text-muted">{periodoLabel(p.periodo)}</td>
                            <td className="px-4 py-2.5">
                              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${situacionColorClass(p.situacion)}`}>
                                {p.situacion}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-muted">{fmtMoney(p.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Cheques rechazados */}
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
              Cheques rechazados {cantidadCheques > 0 && `(${cantidadCheques})`}
            </h2>
            {!cheques || cantidadCheques === 0 ? (
              <p className="text-sm text-muted">Sin cheques rechazados informados.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                      <th className="px-4 py-3">Causal</th>
                      <th className="px-4 py-3">N° Cheque</th>
                      <th className="px-4 py-3">Fecha rechazo</th>
                      <th className="px-4 py-3">Monto</th>
                      <th className="px-4 py-3">Multa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cheques.causales.flatMap((c) =>
                      c.entidades.flatMap((e) =>
                        e.detalle.map((d) => (
                          <tr key={d.nroCheque} className="border-b border-border last:border-0 hover:bg-surface">
                            <td className="px-4 py-3 text-foreground">{c.causal}</td>
                            <td className="px-4 py-3 text-muted">{d.nroCheque}</td>
                            <td className="px-4 py-3 text-muted">{fmtDate.format(new Date(d.fechaRechazo))}</td>
                            <td className="px-4 py-3 text-muted">$ {fmtMoney(d.monto)}</td>
                            <td className="px-4 py-3 text-muted">
                              {d.fechaPagoMulta ? `Paga (${fmtDate.format(new Date(d.fechaPagoMulta))})` : d.estadoMulta ?? "—"}
                            </td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Leyenda — texto oficial del BCRA (Texto ordenado de
          Clasificación de deudores), siempre visible aunque no haya
          antecedentes, para que quien lea el informe sepa qué
          significaría cada número si apareciera. */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">¿Qué significa cada situación?</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Situación</th>
                <th className="px-4 py-3">Cartera comercial</th>
                <th className="px-4 py-3">Cartera consumo o vivienda</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((s) => (
                <tr key={s} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${situacionColorClass(s)}`}>{s}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{SITUACION_DETAIL[s].comercial}</td>
                  <td className="px-4 py-3 text-muted">{SITUACION_DETAIL[s].consumo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
