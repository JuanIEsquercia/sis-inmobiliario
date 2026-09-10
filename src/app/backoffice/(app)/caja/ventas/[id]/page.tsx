import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getSaleById, agentLabel } from "@/lib/caja";
import { ClientPicker } from "@/components/backoffice/ClientPicker";
import { ResponsiveDataGrid } from "@/components/backoffice/ResponsiveDataGrid";
import { ConfirmDeleteButton } from "@/components/backoffice/ConfirmDeleteButton";
import { marcarCuotaPagada, actualizarPartesVenta, eliminarVenta } from "../../actions";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

const partyLabels: Record<string, string> = {
  COMPRADOR: "Comprador",
  VENDEDOR: "Vendedor",
  INQUILINO: "Inquilino",
  PROPIETARIO: "Propietario",
};

const methodLabels: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VentaDetailPage({ params }: PageProps) {
  const profile = await requirePermission("caja.ver");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const sale = await getSaleById(numericId);
  if (!sale) notFound();

  const canCollect = profile.permissions.includes("caja.ventas.crear");
  const totalCobrado = sale.installments
    .filter((i) => i.status === "PAGADA")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="max-w-6xl w-full mx-auto space-y-6">
      <div>
        <Link href="/backoffice/caja/ventas" className="inline-block text-xs font-semibold text-accent hover:underline mb-2">
          ← Volver a Ventas
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {sale.unit.propertyCode} — {sale.unit.address}
        </h1>
        <p className="text-xs text-muted mt-1">
          <Link href={`/backoffice/historial/${sale.unitId}`} className="hover:underline text-accent">
            Ver historial completo de la propiedad
          </Link>
        </p>
      </div>

      {canCollect ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-surface/40 p-4 sm:p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-1">Partes de la Operación</h2>
          <p className="text-xs text-muted/90 mb-4">
            Podés confirmar o actualizar el comprador y la parte vendedora en cualquier momento.
          </p>
          <form action={actualizarPartesVenta.bind(null, sale.id)} className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <ClientPicker namePrefix="seller" roleLabel="Parte vendedora" initialSelected={sale.seller} />
            </div>
            <div className="flex-1">
              <ClientPicker namePrefix="buyer" roleLabel="Comprador" initialSelected={sale.buyer} />
            </div>
            <button
              type="submit"
              className="h-10 rounded-xl border border-border bg-surface px-5 text-xs font-semibold text-foreground hover:bg-background transition-colors sm:self-end cursor-pointer"
            >
              Guardar Partes
            </button>
          </form>
        </div>
      ) : (
        (sale.seller || sale.buyer) && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-border/60 bg-surface p-5 text-sm shadow-xs">
            {sale.seller && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Parte Vendedora</dt>
                <dd className="font-bold text-foreground mt-0.5">
                  {sale.seller.firstName} {sale.seller.lastName}
                </dd>
              </div>
            )}
            {sale.buyer && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Comprador</dt>
                <dd className="font-bold text-foreground mt-0.5">
                  {sale.buyer.firstName} {sale.buyer.lastName}
                </dd>
              </div>
            )}
          </dl>
        )
      )}

      {/* Ficha Resumen de la Venta */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border border-border/60 bg-surface p-5 text-xs sm:text-sm shadow-xs">
        {sale.initialPriceAmount && (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Precio Inicio</dt>
            <dd className="font-bold text-foreground mt-0.5">
              {sale.currency} {fmtMoney(Number(sale.initialPriceAmount))}
            </dd>
          </div>
        )}
        {sale.saleAmount && (
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Precio Cierre</dt>
            <dd className="font-bold text-foreground mt-0.5">
              {sale.currency} {fmtMoney(Number(sale.saleAmount))}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Comisión Acordada</dt>
          <dd className="font-extrabold text-accent mt-0.5">
            {sale.currency} {fmtMoney(Number(sale.commissionAmount))}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Cobrado hasta ahora</dt>
          <dd className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {sale.currency} {fmtMoney(totalCobrado)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Fecha de Cierre</dt>
          <dd className="font-semibold text-foreground mt-0.5">{fmtDate.format(sale.closedAt)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Agente Vendedor</dt>
          <dd className="font-semibold text-foreground mt-0.5">{agentLabel(sale.vendedorAgent)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Agente Captador</dt>
          <dd className="font-semibold text-foreground mt-0.5">{agentLabel(sale.captadorAgent)}</dd>
        </div>
        {sale.notes && (
          <div className="col-span-2 sm:col-span-4 border-t border-border/40 pt-3 mt-1">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Notas</dt>
            <dd className="whitespace-pre-line text-foreground mt-0.5">{sale.notes}</dd>
          </div>
        )}
      </dl>

      {/* Cuotas de la Comisión */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Cobro de la Comisión (Cuotas)</h2>

        <ResponsiveDataGrid
          isEmpty={sale.installments.length === 0}
          emptyMessage="No hay cuotas programadas."
          mobileCards={
            <>
              {sale.installments.map((installment) => (
                <div key={installment.id} className="rounded-2xl border border-border/60 bg-surface p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                    <span className="font-bold text-foreground text-sm">
                      Cuota {installment.numeroCuota} de {installment.totalCuotas}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        installment.status === "PAGADA"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {installment.status === "PAGADA" ? "✓ Cobrada" : "Pendiente"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Monto</span>
                      <span className="font-extrabold text-foreground">
                        {sale.currency} {fmtMoney(Number(installment.amount))}
                      </span>
                    </div>
                    <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Vence</span>
                      <span className="font-semibold text-foreground">{fmtDate.format(installment.dueDate)}</span>
                    </div>
                    <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Atribuida A</span>
                      <span className="font-medium text-foreground">
                        {installment.attributedTo ? partyLabels[installment.attributedTo] : "—"}
                      </span>
                    </div>
                    <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Pagaré</span>
                      <span className="font-medium text-foreground">
                        {installment.pagareFirmado ? "Firmado" : "Sin pagaré"}
                      </span>
                    </div>
                  </div>

                  {canCollect && installment.status !== "PAGADA" && (
                    <form action={marcarCuotaPagada.bind(null, installment.id)} className="flex items-center gap-2 pt-1 border-t border-border/40">
                      <select name="method" defaultValue="TRANSFERENCIA" className="field flex-1 py-1.5 text-xs" required>
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                      </select>
                      <button
                        type="submit"
                        className="h-9 px-4 rounded-xl bg-accent text-xs font-bold text-accent-foreground hover:bg-accent-strong transition-colors cursor-pointer shrink-0"
                      >
                        Marcar Cobrada
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </>
          }
          table={
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5">Cuota</th>
                  <th className="px-4 py-2.5">Vence</th>
                  <th className="px-4 py-2.5">Monto</th>
                  <th className="px-4 py-2.5">Atribuida a</th>
                  <th className="px-4 py-2.5">Pagaré</th>
                  <th className="px-4 py-2.5">Estado</th>
                  {canCollect && <th className="px-4 py-2.5 text-right">Acción</th>}
                </tr>
              </thead>
              <tbody>
                {sale.installments.map((installment) => (
                  <tr key={installment.id} className="border-b border-border last:border-0 hover:bg-surface">
                    <td className="px-4 py-2.5 text-muted font-medium">
                      {installment.numeroCuota}/{installment.totalCuotas}
                    </td>
                    <td className="px-4 py-2.5 text-muted font-medium">{fmtDate.format(installment.dueDate)}</td>
                    <td className="px-4 py-2.5 font-bold text-foreground">{fmtMoney(Number(installment.amount))}</td>
                    <td className="px-4 py-2.5 text-muted">
                      {installment.attributedTo ? partyLabels[installment.attributedTo] : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{installment.pagareFirmado ? "Firmado" : "Sin pagaré"}</td>
                    <td className="px-4 py-2.5 text-muted">
                      {installment.status === "PAGADA" ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Cobrada{installment.paidAt ? ` (${fmtDate.format(installment.paidAt)})` : ""}
                          {installment.method ? ` — ${methodLabels[installment.method]}` : ""}
                        </span>
                      ) : (
                        "Pendiente"
                      )}
                    </td>
                    {canCollect && (
                      <td className="px-4 py-2.5 text-right">
                        {installment.status !== "PAGADA" && (
                          <form action={marcarCuotaPagada.bind(null, installment.id)} className="inline-flex items-center gap-1.5">
                            <select name="method" defaultValue="TRANSFERENCIA" className="field py-1 text-xs" required>
                              <option value="EFECTIVO">Efectivo</option>
                              <option value="TRANSFERENCIA">Transferencia</option>
                            </select>
                            <button
                              type="submit"
                              className="rounded-lg border border-border px-3 py-1 text-xs font-semibold hover:bg-surface cursor-pointer"
                            >
                              Marcar cobrada
                            </button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          }
        />
      </div>

      {/* Reparto de Comisión */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Reparto de la Comisión</h2>
        {sale.commissionScheme ? (
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border border-border/60 bg-surface p-5 text-xs sm:text-sm shadow-xs">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Fondo de Reserva</dt>
              <dd className="font-semibold text-foreground mt-0.5">{sale.currency} {fmtMoney(Number(sale.reservaAmount))}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Agente Fijo ({sale.commissionScheme.agenteFijo.firstName})
              </dt>
              <dd className="font-semibold text-foreground mt-0.5">{sale.currency} {fmtMoney(Number(sale.agenteFijoAmount))}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Vendedor</dt>
              <dd className="font-semibold text-foreground mt-0.5">{sale.currency} {fmtMoney(Number(sale.vendedorAmount))}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Captador</dt>
              <dd className="font-semibold text-foreground mt-0.5">{sale.currency} {fmtMoney(Number(sale.captadorAmount))}</dd>
            </div>
            <div className="col-span-2 sm:col-span-4 border-t border-border/40 pt-3">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">Inmobiliaria (Neto)</dt>
              <dd className="font-extrabold text-foreground text-sm mt-0.5">{sale.currency} {fmtMoney(Number(sale.agenciaAmount))}</dd>
            </div>
          </dl>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 p-5 text-xs text-muted">
            Todavía no hay un esquema de comisiones de Venta configurado — esta venta se guardó sin repartir.
          </div>
        )}
      </div>

      {canCollect && (
        <div className="space-y-3 border-t border-border/40 pt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Eliminar venta</h2>
          <p className="text-xs text-muted/90 max-w-xl">
            Solo para corregir una carga errónea. Se borra la venta con todo lo vinculado: sus cuotas de comisión
            {totalCobrado > 0 && ", los cobros ya confirmados (esa plata se descuenta de la Caja) y lo ya pagado a agentes por esta venta"}.
            No se puede deshacer.
          </p>
          <ConfirmDeleteButton
            action={eliminarVenta.bind(null, sale.id)}
            triggerLabel="Eliminar venta definitivamente"
            triggerClassName="rounded-lg border border-rose-500/40 bg-rose-500/5 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="¿Eliminar esta venta?"
            description={
              totalCobrado > 0
                ? `Se va a borrar la venta de ${sale.unit.propertyCode} — ${sale.unit.address}, sus cuotas, y los ${sale.currency} ${fmtMoney(totalCobrado)} ya cobrados van a salir de la Caja. Esta acción no se puede deshacer.`
                : `Se va a borrar la venta de ${sale.unit.propertyCode} — ${sale.unit.address} y sus cuotas de comisión. Esta acción no se puede deshacer.`
            }
            confirmLabel="Sí, eliminar"
          />
        </div>
      )}
    </div>
  );
}
