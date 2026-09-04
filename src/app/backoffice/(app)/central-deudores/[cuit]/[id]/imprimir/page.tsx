import { notFound } from "next/navigation";
import Image from "next/image";
import { requirePermission } from "@/lib/auth";
import {
  getCreditCheckById,
  ultimoPeriodo,
  totalChequesRechazados,
  resumenChequesRechazados,
  consultantLabel,
  groupHistoricoByEntidad,
} from "@/lib/central-deudores";
import { SITUACION_LABELS, SITUACION_DETAIL, situacionRowClass, type DeudaResult, type ChequesResult } from "@/lib/bcra";
import { AutoPrint } from "@/components/backoffice/AutoPrint";
import { PrintButton } from "@/components/backoffice/PrintButton";

const fmtDateTime = new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short" });
const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

function periodoLabel(periodo: string): string {
  if (!/^\d{6}$/.test(periodo)) return periodo;
  return `${periodo.slice(4)}/${periodo.slice(0, 4)}`;
}

interface PageProps {
  params: Promise<{ cuit: string; id: string }>;
}

export default async function ImprimirCreditCheckPage({ params }: PageProps) {
  await requirePermission("administraciones.crear");
  const { cuit, id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const check = await getCreditCheckById(numericId);
  if (!check || check.cuit !== cuit) notFound();

  const deuda = check.deudaData as unknown as DeudaResult | null;
  const historico = check.historicoData as unknown as DeudaResult | null;
  const cheques = check.chequesRechazadosData as unknown as ChequesResult | null;
  const periodoActual = ultimoPeriodo(deuda);
  const cantidadCheques = totalChequesRechazados(cheques);
  const resumenCheques = resumenChequesRechazados(cheques);
  const historicoPorBanco = groupHistoricoByEntidad(historico);

  return (
    <div
      className="mx-auto max-w-3xl bg-white p-8 sm:p-12 text-neutral-900 shadow-sm print:shadow-none print:p-0 print:max-w-full"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page { size: A4 portrait; margin: 20mm; }
        @media print { body { background: white !important; color: black !important; } }
      `,
        }}
      />

      <AutoPrint />
      <div className="print:hidden mb-6 flex justify-end">
        <PrintButton />
      </div>

      {/* Cabecera Corporativa */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-neutral-200 pb-8">
        <div className="flex items-center gap-4">
          <Image src="/logo-light.png" alt="Garcia Propiedades" width={455} height={337} priority className="h-16 w-auto" />
          <div className="h-12 w-px bg-neutral-200 hidden sm:block" />
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider text-[#c52125]">Garcia Propiedades</h1>
            <p className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mt-0.5">
              Informe de Central de Deudores — BCRA
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right border-l-2 border-[#c52125] pl-4 sm:border-l-0 sm:pl-0">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Consultado</p>
          <p className="text-sm font-light tracking-tight text-neutral-800">{fmtDateTime.format(check.consultedAt)}</p>
          <p className="text-xs text-neutral-500">por {consultantLabel(check.consultedBy)}</p>
        </div>
      </div>

      {/* Datos del postulante */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-12 text-sm bg-neutral-50 rounded-2xl p-6 border border-neutral-100">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">Denominación (AFIP)</span>
          <span className="text-neutral-800 font-semibold text-base">{check.denominacion ?? "Sin registrar"}</span>
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">CUIT / CUIL</span>
          <span className="text-neutral-800 font-medium font-mono">{check.cuit}</span>
        </div>
      </div>

      {!check.found ? (
        <div className="mb-8 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 text-sm text-neutral-700">
          Sin antecedentes en el BCRA a la fecha de esta consulta — no figura deuda en el sistema financiero, ni
          historial de atrasos, ni cheques rechazados para este CUIT/CUIL.
        </div>
      ) : (
        <>
          {/* Situación actual */}
          <div className="mb-8">
            <h3 className="font-bold text-[#c52125] uppercase tracking-wider text-xs mb-3">
              Situación actual {periodoActual && `— período ${periodoLabel(periodoActual.periodo)}`}
            </h3>
            {!periodoActual || periodoActual.entidades.length === 0 ? (
              <p className="text-sm text-neutral-500">Sin deuda informada en el sistema financiero.</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-neutral-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-100/80 border-b border-neutral-200 text-left text-xs font-bold uppercase tracking-wider text-neutral-600">
                      <th className="px-4 py-3">Entidad</th>
                      <th className="px-4 py-3">Situación</th>
                      <th className="px-4 py-3 text-right">Monto (miles $)</th>
                      <th className="px-4 py-3 text-right">Días atraso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white">
                    {periodoActual.entidades.map((e, i) => (
                      <tr key={`${e.entidad}-${i}`} className={situacionRowClass(e.situacion)}>
                        <td className="px-4 py-3 text-neutral-800">{e.entidad}</td>
                        <td className="px-4 py-3 text-neutral-800">
                          {e.situacion} — {SITUACION_LABELS[e.situacion] ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-800">{fmtMoney(e.monto)}</td>
                        <td className="px-4 py-3 text-right text-neutral-800">{e.diasAtrasoPago ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Histórico 24 meses — agrupado por banco */}
          <div className="mb-8">
            <h3 className="font-bold text-[#c52125] uppercase tracking-wider text-xs mb-3">Histórico (24 meses)</h3>
            {historicoPorBanco.length === 0 ? (
              <p className="text-sm text-neutral-500">Sin historial informado.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {historicoPorBanco.map((banco) => (
                  <div key={banco.entidad} className="overflow-hidden rounded-2xl border border-neutral-200">
                    <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-100/80 px-4 py-2.5">
                      <span className="text-sm font-semibold text-neutral-800">{banco.entidad}</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                        Peor situación: {banco.peorSituacion}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-200 text-left text-xs font-bold uppercase tracking-wider text-neutral-600">
                          <th className="px-4 py-2.5">Período</th>
                          <th className="px-4 py-2.5">Situación</th>
                          <th className="px-4 py-2.5 text-right">Monto (miles $)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 bg-white">
                        {banco.periodos.map((p) => (
                          <tr key={p.periodo} className={situacionRowClass(p.situacion)}>
                            <td className="px-4 py-2.5 text-neutral-800">{periodoLabel(p.periodo)}</td>
                            <td className="px-4 py-2.5 text-neutral-800">{p.situacion}</td>
                            <td className="px-4 py-2.5 text-right text-neutral-800">{fmtMoney(p.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cheques rechazados */}
          <div className="mb-8">
            <h3 className="font-bold text-[#c52125] uppercase tracking-wider text-xs mb-3">
              Cheques rechazados {cantidadCheques > 0 && `(${cantidadCheques})`}
            </h3>
            {!cheques || cantidadCheques === 0 ? (
              <p className="text-sm text-neutral-500">Sin cheques rechazados informados.</p>
            ) : (
              <>
                {/* Resumen calculado acá — la API no lo trae armado, a
                    diferencia del reporte que publica la propia web del
                    BCRA (ver comentario en resumenChequesRechazados). */}
                <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">Total rechazados</p>
                    <p className="text-base font-bold text-neutral-800">{resumenCheques.totalCantidad}</p>
                    <p className="text-xs text-neutral-500">$ {fmtMoney(resumenCheques.totalMonto)}</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">Abonados (levantados)</p>
                    <p className="text-base font-bold text-neutral-800">{resumenCheques.abonadosCantidad}</p>
                    <p className="text-xs text-neutral-500">$ {fmtMoney(resumenCheques.abonadosMonto)}</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500">% abonados</p>
                    <p className="text-base font-bold text-neutral-800">
                      {resumenCheques.totalCantidad > 0
                        ? `${((resumenCheques.abonadosCantidad / resumenCheques.totalCantidad) * 100).toFixed(2)}%`
                        : "—"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {resumenCheques.totalMonto > 0
                        ? `${((resumenCheques.abonadosMonto / resumenCheques.totalMonto) * 100).toFixed(2)}% en monto`
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-neutral-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-neutral-100/80 border-b border-neutral-200 text-left text-xs font-bold uppercase tracking-wider text-neutral-600">
                        <th className="px-4 py-3">Causal</th>
                        <th className="px-4 py-3">N° Cheque</th>
                        <th className="px-4 py-3">Fecha rechazo</th>
                        <th className="px-4 py-3 text-right">Monto</th>
                        <th className="px-4 py-3">Fecha de pago (cheque)</th>
                        <th className="px-4 py-3">Multa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 bg-white">
                      {cheques.causales.flatMap((c) =>
                        c.entidades.flatMap((e) =>
                          e.detalle.map((d) => (
                            <tr key={d.nroCheque}>
                              <td className="px-4 py-3 text-neutral-800">{c.causal}</td>
                              <td className="px-4 py-3 text-neutral-800">{d.nroCheque}</td>
                              <td className="px-4 py-3 text-neutral-800">{fmtDate.format(new Date(d.fechaRechazo))}</td>
                              <td className="px-4 py-3 text-right text-neutral-800">$ {fmtMoney(d.monto)}</td>
                              <td className="px-4 py-3 text-neutral-800">
                                {d.fechaPago ? fmtDate.format(new Date(d.fechaPago)) : "Sin abonar"}
                              </td>
                              <td className="px-4 py-3 text-neutral-800">
                                {d.fechaPagoMulta ? `Paga (${fmtDate.format(new Date(d.fechaPagoMulta))})` : d.estadoMulta ?? "—"}
                              </td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Leyenda — texto oficial del BCRA, siempre impresa aunque no
          haya antecedentes, para que el propietario sepa qué
          significaría cada número si apareciera. */}
      <div className="mb-8">
        <h3 className="font-bold text-[#c52125] uppercase tracking-wider text-xs mb-3">¿Qué significa cada situación?</h3>
        <div className="overflow-hidden rounded-2xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-100/80 border-b border-neutral-200 text-left text-xs font-bold uppercase tracking-wider text-neutral-600">
                <th className="px-4 py-3">Situación</th>
                <th className="px-4 py-3">Cartera comercial</th>
                <th className="px-4 py-3">Cartera consumo o vivienda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {[1, 2, 3, 4, 5].map((s) => (
                <tr key={s}>
                  <td className="px-4 py-3 font-semibold text-neutral-800">{s}</td>
                  <td className="px-4 py-3 text-neutral-700">{SITUACION_DETAIL[s].comercial}</td>
                  <td className="px-4 py-3 text-neutral-700">{SITUACION_DETAIL[s].consumo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center text-[10px] text-neutral-400 uppercase tracking-widest leading-relaxed">
        Fuente: Banco Central de la República Argentina — API pública Central de Deudores del Sistema Financiero.
        <br />
        Su difusión no implica conformidad por parte del Banco Central de la República Argentina.
        Informe generado el {fmtDate.format(new Date())} a partir de esta consulta puntual.
      </p>
    </div>
  );
}
