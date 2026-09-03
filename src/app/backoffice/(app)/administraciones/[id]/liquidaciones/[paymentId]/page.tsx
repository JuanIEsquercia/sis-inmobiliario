import { notFound } from "next/navigation";
import Link from "next/link";
import { getPaymentById, paymentBreakdown, clientLabel } from "@/lib/alquileres";
import { requirePermission } from "@/lib/auth";
import {
  guardarLiquidacion,
  marcarLiquidacionEnviada,
  registrarCobro,
  registrarPagoPropietario,
  reabrirLiquidacion,
  agregarConceptoLiquidacion,
  quitarConceptoLiquidacion,
} from "../../../actions";
import { DatePicker } from "@/components/backoffice/DatePicker";

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

const paymentStatusLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  ENVIADA: "Enviada",
  PARCIAL: "Parcial",
  PAGADO: "Pagado",
};

interface PageProps {
  params: Promise<{ id: string; paymentId: string }>;
}

export default async function LiquidacionDetailPage({ params }: PageProps) {
  const profile = await requirePermission("administraciones.ver");
  const { id, paymentId } = await params;
  const numericPaymentId = Number(paymentId);
  if (!Number.isFinite(numericPaymentId)) notFound();

  const payment = await getPaymentById(numericPaymentId);
  if (!payment || String(payment.contractId) !== id) notFound();

  const canEdit = profile.permissions.includes("administraciones.pagos");
  const isPaid = payment.status === "PAGADO";
  const isSent = payment.status === "ENVIADA";
  const isPartial = payment.status === "PARCIAL";
  const isLocked = isPaid || isSent || isPartial;
  const { total, managementFee, netForOwner } = paymentBreakdown(
    payment.items,
    payment.contract.managementFeePercent
  );
  const cobrado = Number(payment.paidAmount ?? 0);
  const saldo = total - cobrado;

  return (
    <div className="max-w-6xl w-full mx-auto">
      {/* Cabecera Superior Ampliada */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <Link href={`/backoffice/administraciones/${id}`} className="text-xs font-semibold uppercase tracking-wider text-accent hover:underline flex items-center gap-1.5 mb-2">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver al contrato
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Liquidación {monthNames[payment.periodMonth - 1]} {payment.periodYear}
          </h1>
          <p className="text-xs text-muted mt-1">
            Vence {fmtDate.format(payment.dueDate)} · Inquilino: {clientLabel(payment.contract.tenant)}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-surface border border-border/80 px-3 py-1 text-xs font-semibold text-foreground mr-2">
            Estado: {paymentStatusLabels[payment.status]}
          </span>
          <Link
            href={`/backoffice/administraciones/${id}/liquidaciones/${payment.id}/imprimir?para=inquilino`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface/10 hover:text-foreground transition-colors shadow-xs"
          >
            PDF Inquilino
          </Link>
          <Link
            href={`/backoffice/administraciones/${id}/liquidaciones/${payment.id}/imprimir?para=propietario`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-surface/10 hover:text-foreground transition-colors shadow-xs"
          >
            PDF Propietario
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Columna Principal Izquierda (Conceptos y Listas) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* CBU/Alias info */}
          {(payment.contract.paymentAlias || payment.contract.paymentCBU) && (
            <div className="rounded-xl border border-border/80 bg-surface/40 p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-muted">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Datos de Cobro del Contrato:
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {payment.contract.paymentAlias && <span><strong>Alias:</strong> {payment.contract.paymentAlias}</span>}
                {payment.contract.paymentCBU && <span><strong>CBU:</strong> {payment.contract.paymentCBU}</span>}
              </div>
            </div>
          )}

          {/* Formulario invisible de Guardar Montos */}
          <form id="guardar-montos-form" action={guardarLiquidacion.bind(null, payment.id)} />

          {/* Listado y Edición de Conceptos */}
          <div className="rounded-xl border border-border bg-surface/30 p-5 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-4">Detalle de Conceptos</h2>
            
            <div className="flex flex-col gap-4">
              {payment.items.map((item) => (
                <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[1.5fr_120px_2fr_auto] items-center gap-3 border-b border-border/40 pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{item.concept.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.concept.isSystem && <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Automático</span>}
                      {item.amount !== null && Number(item.amount) < 0 && (
                        <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                          Descuento
                        </span>
                      )}
                    </div>
                  </div>
                  <input type="hidden" form="guardar-montos-form" name="itemId" value={item.id} />
                  
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider sm:hidden block mb-1">Monto</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-muted font-semibold">{payment.currency}</span>
                      <input
                        form="guardar-montos-form"
                        name={`amount.${item.id}`}
                        type="number"
                        step="0.01"
                        defaultValue={item.amount ? item.amount.toString() : ""}
                        placeholder="0.00"
                        disabled={!canEdit || isLocked}
                        className="field pl-11 w-full text-sm font-semibold text-foreground"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider sm:hidden block mb-1">Notas</label>
                    <input
                      form="guardar-montos-form"
                      name={`notes.${item.id}`}
                      defaultValue={item.notes ?? ""}
                      placeholder="Notas explicativas del concepto..."
                      disabled={!canEdit || isLocked}
                      className="field w-full text-sm"
                    />
                  </div>
                  
                  <div className="flex justify-end pl-2">
                    {canEdit && !isLocked && !item.concept.isSystem ? (
                      <form action={quitarConceptoLiquidacion.bind(null, payment.id, item.id)}>
                        <button type="submit" className="text-xs font-bold text-accent hover:text-accent-strong hover:underline p-1 cursor-pointer">
                          Quitar
                        </button>
                      </form>
                    ) : (
                      <span className="w-10 sm:block hidden" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {canEdit && !isLocked && (
              <div className="mt-6 border-t border-border/60 pt-5">
                <button
                  type="submit"
                  form="guardar-montos-form"
                  className="rounded-lg bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wider text-accent-foreground hover:bg-accent-strong shadow-xs transition-colors cursor-pointer"
                >
                  Guardar Cambios de Montos
                </button>
              </div>
            )}
          </div>

          {/* Formulario Agregar Concepto */}
          {canEdit && !isLocked && (
            <div className="rounded-xl border border-border bg-surface/30 p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Agregar Concepto Extra</h3>
              <form
                action={agregarConceptoLiquidacion.bind(null, payment.id)}
                className="grid grid-cols-1 sm:grid-cols-[1.3fr_110px_100px_auto] items-end gap-3"
              >
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="conceptName" className="text-xs text-muted">
                    Concepto (ej. Mora, Descuento por gasto a cargo del inquilino)
                  </label>
                  <input id="conceptName" name="conceptName" required className="field w-full" placeholder="Mora" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="conceptAmount" className="text-xs text-muted">
                    Monto
                  </label>
                  <input id="conceptAmount" name="amount" type="number" step="0.01" min={0} className="field w-full" placeholder="0.00" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="itemType" className="text-xs text-muted">
                    Tipo
                  </label>
                  <select id="itemType" name="itemType" defaultValue="CARGO" className="field w-full">
                    <option value="CARGO" className="bg-surface text-foreground">Cargo (+)</option>
                    <option value="DESCUENTO" className="bg-surface text-foreground">Descuento (−)</option>
                  </select>
                </div>
                <button type="submit" className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-surface/10 hover:text-foreground cursor-pointer shadow-xs">
                  Agregar
                </button>
              </form>
              <p className="mt-2 text-[11px] text-muted leading-relaxed">
                Un descuento resta del total a pagar — por ejemplo, si el inquilino se hizo cargo de un gasto del
                propietario durante el mes.
              </p>
            </div>
          )}
        </div>

        {/* Panel Lateral Derecho (Totales y Pagos) */}
        <div className="flex flex-col gap-6">
          {/* Tarjeta de Resumen Financiero */}
          <div className="rounded-xl border border-border bg-surface/40 p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">Resumen Económico</h3>
            <div className="flex flex-col gap-3.5 text-sm">
              <div className="flex items-center justify-between text-muted">
                <span>Total Alquiler / Liquidación</span>
                <span className="font-semibold text-foreground">
                  {payment.currency} {fmtMoney(total)}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>Retención Inmobiliaria ({payment.contract.managementFeePercent?.toString() ?? "0"}%)</span>
                <span className="font-medium text-accent">
                  − {payment.currency} {fmtMoney(managementFee)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border/80 pt-3">
                <span className="font-bold text-foreground">Neto Propietario</span>
                <span className="text-lg font-bold text-[#c52125]">
                  {payment.currency} {fmtMoney(netForOwner)}
                </span>
              </div>
            </div>
          </div>

          {/* Tarjeta de Cobros y Saldos */}
          {(isPartial || isPaid) && (
            <div className="rounded-xl border border-border bg-surface/40 p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">Historial de Cobros</h3>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Total Cobrado</span>
                  <span className="font-semibold text-foreground">
                    {payment.currency} {fmtMoney(cobrado)}
                  </span>
                </div>
                {isPartial && (
                  <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
                    <span className="text-muted">Saldo Restante</span>
                    <span className="font-bold text-accent">
                      {payment.currency} {fmtMoney(saldo)}
                    </span>
                  </div>
                )}
                
                {payment.partialPayments.length > 0 && (
                  <div className="mt-2 border-t border-border/80 pt-3">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-2">Detalle de Pagos Recibidos</span>
                    <ul className="flex flex-col gap-2 font-medium text-xs text-muted">
                      {payment.partialPayments.map((p) => (
                        <li key={p.id} className="flex justify-between items-start gap-2 border-b border-border/30 pb-1.5 last:border-0 last:pb-0">
                          <div className="flex flex-col">
                            <span>
                              {fmtDate.format(p.paidAt)}
                              {p.method && ` · ${p.method === "EFECTIVO" ? "Efectivo" : "Transferencia"}`}
                            </span>
                            {p.notes && <span className="text-[10px] text-muted/75 font-normal">{p.notes}</span>}
                          </div>
                          <span className="text-foreground font-semibold flex-none">
                            {payment.currency} {fmtMoney(Number(p.amount))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones de Envío / Acciones Generales */}
          {canEdit && !isPaid && (
            <div className="flex flex-col gap-2.5">
              {payment.status === "PENDIENTE" && (
                <form action={marcarLiquidacionEnviada.bind(null, payment.id)} className="w-full">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-accent text-accent-foreground px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-accent-strong transition-colors cursor-pointer shadow-xs text-center"
                  >
                    Marcar como enviada
                  </button>
                </form>
              )}
              {isSent && (
                <form action={reabrirLiquidacion.bind(null, payment.id)} className="w-full">
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-surface-soft hover:text-foreground transition-colors cursor-pointer shadow-xs text-center"
                  >
                    Reabrir para editar
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Formulario Registrar Cobro */}
          {canEdit && !isPaid && (
            <div className="rounded-xl border border-dashed border-border bg-surface/30 p-5 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                Registrar Cobro
              </h4>
              <form
                action={registrarCobro.bind(null, payment.id)}
                className="flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1">
                  <label htmlFor="amount" className="text-xs text-muted">
                    Monto cobrado ({payment.currency})
                  </label>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={saldo > 0 ? saldo.toFixed(2) : total.toFixed(2)}
                    className="field w-full text-sm font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="paidAt" className="text-xs text-muted">
                    Fecha de pago
                  </label>
                  <DatePicker id="paidAt" name="paidAt" className="field w-full text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="method" className="text-xs text-muted">
                    Medio de cobro
                  </label>
                  <select id="method" name="method" defaultValue="TRANSFERENCIA" required className="field w-full text-sm">
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia a propietario</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="cobroNotes" className="text-xs text-muted">
                    Notas / Referencia
                  </label>
                  <input id="cobroNotes" name="notes" className="field w-full text-sm" placeholder="Opcional" />
                </div>

                <button
                  type="submit"
                  className="rounded-lg bg-accent text-accent-foreground px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent-strong transition-colors cursor-pointer shadow-xs"
                >
                  Registrar Pago
                </button>
                
                <p className="text-[10px] text-muted leading-relaxed">
                  Si registras un monto menor al saldo pendiente, la liquidación quedará en estado <strong>&quot;Parcial&quot;</strong> y podrás registrar más cobros luego.
                </p>
              </form>
            </div>
          )}

          {/* Pago al propietario */}
          {isPaid && (
            <div className="rounded-xl border border-dashed border-border bg-surface/30 p-5 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Pago al propietario
              </h4>
              {payment.ownerPaidAt ? (
                <p className="text-xs text-muted">
                  Pagado el {fmtDate.format(payment.ownerPaidAt)} ·{" "}
                  {payment.ownerPaymentMethod === "EFECTIVO" ? "Efectivo" : "Transferencia"}
                </p>
              ) : canEdit ? (
                <form action={registrarPagoPropietario.bind(null, payment.id)} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                    <span className="text-muted">Neto propietario</span>
                    <span className="font-medium text-foreground">
                      {payment.currency} {fmtMoney(netForOwner)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="ownerPaidAt" className="text-xs text-muted">
                      Fecha de pago
                    </label>
                    <DatePicker id="ownerPaidAt" name="ownerPaidAt" className="field w-full text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="ownerMethod" className="text-xs text-muted">
                      Medio de pago
                    </label>
                    <select
                      id="ownerMethod"
                      name="method"
                      defaultValue="TRANSFERENCIA"
                      required
                      className="field w-full text-sm"
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-accent text-accent-foreground px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent-strong transition-colors cursor-pointer shadow-xs"
                  >
                    Confirmar pago al propietario
                  </button>
                </form>
              ) : (
                <p className="text-xs text-muted">Todavía no se le pagó al propietario.</p>
              )}
            </div>
          )}

          {/* Fechas de Registro */}
          <div className="text-[11px] text-muted flex flex-col gap-1 pl-1">
            {isSent && payment.sentAt && (
              <span>Enviada el {fmtDate.format(payment.sentAt)}</span>
            )}
            {isPaid && payment.paidAt && (
              <span>Pagada el {fmtDate.format(payment.paidAt)} (Total: {payment.currency} {fmtMoney(cobrado)})</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
