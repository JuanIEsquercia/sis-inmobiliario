import { notFound } from "next/navigation";
import Image from "next/image";
import { getPaymentById, paymentBreakdown, clientLabel } from "@/lib/alquileres";
import { requirePermission, getContractGroupScope } from "@/lib/auth";
import { AutoPrint } from "@/components/backoffice/AutoPrint";
import { PrintButton } from "@/components/backoffice/PrintButton";

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  params: Promise<{ id: string; paymentId: string }>;
  searchParams: Promise<{ para?: string }>;
}

export default async function ImprimirLiquidacionPage({ params, searchParams }: PageProps) {
  const profile = await requirePermission("administraciones.ver");
  const scope = await getContractGroupScope(profile);
  const { id, paymentId } = await params;
  const numericPaymentId = Number(paymentId);
  if (!Number.isFinite(numericPaymentId)) notFound();

  const payment = await getPaymentById(numericPaymentId, scope);
  if (!payment || String(payment.contractId) !== id) notFound();

  // Dos variantes del mismo comprobante: al inquilino solo le
  // corresponde ver cuánto debe y dónde pagar; al propietario, además,
  // cuánto se le retiene de comisión y cuánto se le deposita neto — esa
  // parte nunca va en la copia del inquilino.
  const { para: paraRaw } = await searchParams;
  const isPropietario = paraRaw === "propietario";

  const { total, managementFee, netForOwner } = paymentBreakdown(
    payment.items,
    payment.contract.managementFeePercent
  );
  const cobrado = Number(payment.paidAmount ?? 0);
  const saldo = total - cobrado;
  const isPaid = payment.status === "PAGADO";
  const isPartial = payment.status === "PARCIAL";

  return (
    <div
      className="mx-auto max-w-3xl bg-white p-8 sm:p-12 text-neutral-900 shadow-sm print:shadow-none print:p-0 print:max-w-full"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4 portrait;
          margin: 20mm;
        }
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
        }
      `}} />
      
      <AutoPrint />
      <div className="print:hidden mb-6 flex justify-end">
        <PrintButton />
      </div>

      {/* Cabecera Corporativa Premium */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-neutral-200 pb-8">
        <div className="flex items-center gap-4">
          <Image src="/logo-light.png" alt="Garcia Propiedades" width={455} height={337} priority className="h-16 w-auto" />
          <div className="h-12 w-px bg-neutral-200 hidden sm:block" />
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider text-[#c52125]">Garcia Propiedades</h1>
            <p className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mt-0.5">
              Liquidación de alquiler — {isPropietario ? "propietario" : "inquilino"}
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right border-l-2 border-[#c52125] pl-4 sm:border-l-0 sm:pl-0">
          <p className="text-2xl font-light tracking-tight text-neutral-800">
            {monthNames[payment.periodMonth - 1]} {payment.periodYear}
          </p>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">Vence {fmtDate.format(payment.dueDate)}</p>
        </div>
      </div>

      {/* Banners de Estado */}
      {isPaid && (
        <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50/50 px-6 py-3 text-center text-sm font-bold tracking-wider text-emerald-800 uppercase">
          ✓ Comprobante de Pago Completado
        </div>
      )}
      {isPartial && (
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50/50 px-6 py-4 text-center">
          <p className="text-sm font-bold tracking-wider text-amber-800 uppercase">Pago Parcial Registrado</p>
          <p className="text-xs text-amber-700 mt-1">
            Cobrado {payment.currency} {fmtMoney(cobrado)} — Saldo pendiente {payment.currency} {fmtMoney(saldo)}
          </p>
        </div>
      )}

      {/* Cuadrícula de Datos de la Liquidación */}
      <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-12 text-sm bg-neutral-50 rounded-2xl p-6 border border-neutral-100">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">Inquilino</span>
          <span className="text-neutral-800 font-semibold text-base">{clientLabel(payment.contract.tenant)}</span>
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">Propietario</span>
          <span className="text-neutral-800 font-semibold text-base">{clientLabel(payment.contract.owner)}</span>
        </div>
        <div className="sm:col-span-2 border-t border-neutral-200/60 pt-4 mt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">Propiedad Asociada</span>
          <span className="text-neutral-800 font-medium">
            <span className="font-bold text-[#c52125]">{payment.contract.unit.propertyCode}</span> — {payment.contract.unit.address}
          </span>
        </div>
      </div>

      {/* Tabla Detallada de Conceptos */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-100/80 border-b border-neutral-200 text-left text-xs font-bold uppercase tracking-wider text-neutral-600">
              <th className="px-6 py-3.5">Detalle del Concepto</th>
              <th className="px-6 py-3.5 text-right w-36">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {payment.items.map((item) => {
              const amount = item.amount ? Number(item.amount) : null;
              const isDiscount = amount !== null && amount < 0;
              return (
                <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4 text-neutral-800 font-medium">
                    {item.concept.name}
                    {isDiscount && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#c52125]">Descuento</span>}
                  </td>
                  <td className={`px-6 py-4 text-right font-semibold ${isDiscount ? "text-[#c52125]" : "text-neutral-900"}`}>
                    {amount !== null ? `${isDiscount ? "− " : ""}${payment.currency} ${fmtMoney(Math.abs(amount))}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sección de Totales — igual para las dos copias: el inquilino
          también tiene que ver cuánto se retiene y cuánto le corresponde
          al propietario, sobre todo cuando es él quien divide la
          transferencia (ver tenantPaysCommission más abajo). */}
      <div className="mb-10 flex flex-col items-end">
        <div className="w-full sm:w-80 bg-neutral-50 rounded-2xl p-6 border border-neutral-200">
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between text-neutral-600">
              <span>Total Alquiler / Liquidación</span>
              <span className="font-medium text-neutral-800">{payment.currency} {fmtMoney(total)}</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>Comisión de Administración ({payment.contract.managementFeePercent?.toString() ?? "0"}%)</span>
              <span>− {payment.currency} {fmtMoney(managementFee)}</span>
            </div>
            <div className="border-t border-neutral-200 pt-3 flex justify-between items-center">
              <span className="font-bold text-neutral-800 text-base">
                {isPropietario ? "Neto Propietario" : "Total a Pagar"}
              </span>
              <span className="text-xl font-bold text-[#c52125]">
                {payment.currency} {fmtMoney(isPropietario ? netForOwner : total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Datos Bancarios para Transferencia (Solo Inquilino si no está pagado) —
          si el inquilino transfiere la comisión directo a la inmobiliaria
          (tenantPaysCommission), son DOS cuentas y DOS montos distintos,
          no una transferencia única por el total. */}
      {!isPropietario && !isPaid && (
        <>
          {payment.contract.tenantPaysCommission ? (
            <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 p-6 text-sm">
              <h3 className="font-bold text-[#c52125] uppercase tracking-wider text-xs mb-3">Instrucciones de Pago</h3>
              <p className="text-neutral-600 mb-4 font-normal">
                Este pago se divide en dos transferencias — por favor envía el comprobante de cada una.
              </p>
              <div className="flex flex-col gap-4">
                {(payment.contract.paymentAlias || payment.contract.paymentCBU) && (
                  <div className="bg-white rounded-xl border border-neutral-100 p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Al propietario</span>
                      <span className="text-sm font-bold text-neutral-800">{payment.currency} {fmtMoney(netForOwner)}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                      {payment.contract.paymentAlias && (
                        <div>
                          <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Alias</span>
                          <span className="text-neutral-800 font-semibold">{payment.contract.paymentAlias}</span>
                        </div>
                      )}
                      {payment.contract.paymentCBU && (
                        <div>
                          <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">CBU</span>
                          <span className="text-neutral-800 font-semibold">{payment.contract.paymentCBU}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {(payment.contract.commissionAlias || payment.contract.commissionCBU) && (
                  <div className="bg-white rounded-xl border border-neutral-100 p-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">A la inmobiliaria (comisión)</span>
                      <span className="text-sm font-bold text-neutral-800">{payment.currency} {fmtMoney(managementFee)}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                      {payment.contract.commissionAlias && (
                        <div>
                          <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Alias</span>
                          <span className="text-neutral-800 font-semibold">{payment.contract.commissionAlias}</span>
                        </div>
                      )}
                      {payment.contract.commissionCBU && (
                        <div>
                          <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">CBU</span>
                          <span className="text-neutral-800 font-semibold">{payment.contract.commissionCBU}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            (payment.contract.paymentAlias || payment.contract.paymentCBU) && (
              <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50/50 p-6 text-sm">
                <h3 className="font-bold text-[#c52125] uppercase tracking-wider text-xs mb-3">Instrucciones de Pago</h3>
                <p className="text-neutral-600 mb-3 font-normal">Por favor realiza una transferencia bancaria a los siguientes datos y envía el comprobante de pago.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white rounded-xl border border-neutral-100 p-4 font-mono text-xs">
                  {payment.contract.paymentAlias && (
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Alias</span>
                      <span className="text-neutral-800 font-semibold selection:bg-[#c52125]/10">{payment.contract.paymentAlias}</span>
                    </div>
                  )}
                  {payment.contract.paymentCBU && (
                    <div>
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">CBU</span>
                      <span className="text-neutral-800 font-semibold selection:bg-[#c52125]/10">{payment.contract.paymentCBU}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
