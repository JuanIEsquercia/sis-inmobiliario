import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getSaleById, agentLabel } from "@/lib/caja";
import { ClientPicker } from "@/components/backoffice/ClientPicker";
import { marcarCuotaPagada, actualizarPartesVenta } from "../../actions";

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
    <div className="max-w-6xl w-full mx-auto">
      <Link href="/backoffice/caja/ventas" className="mb-4 inline-block text-xs font-semibold text-accent hover:underline">
        ← Volver a Ventas
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-foreground">
        {sale.unit.propertyCode} — {sale.unit.address}
      </h1>
      <p className="mb-6 text-sm text-muted">
        <Link href={`/backoffice/historial/${sale.unitId}`} className="hover:underline">
          Ver historial de la propiedad
        </Link>
      </p>

      {canCollect ? (
        <div className="mb-6 rounded-xl border border-dashed border-border p-5">
          <h2 className="mb-3 text-sm font-medium text-foreground">Partes de la operación</h2>
          <p className="mb-3 text-xs text-muted">
            No hace falta completarlas al cargar la venta — se pueden confirmar después.
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
              className="h-fit rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface sm:self-end"
            >
              Guardar
            </button>
          </form>
        </div>
      ) : (
        (sale.seller || sale.buyer) && (
          <dl className="mb-6 grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl border border-border p-5 text-sm">
            {sale.seller && (
              <div>
                <dt className="text-muted">Parte vendedora</dt>
                <dd className="text-foreground">
                  {sale.seller.firstName} {sale.seller.lastName}
                </dd>
              </div>
            )}
            {sale.buyer && (
              <div>
                <dt className="text-muted">Comprador</dt>
                <dd className="text-foreground">
                  {sale.buyer.firstName} {sale.buyer.lastName}
                </dd>
              </div>
            )}
          </dl>
        )
      )}

      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl border border-border p-5 text-sm">
        {sale.initialPriceAmount && (
          <div>
            <dt className="text-muted">Precio de inicio</dt>
            <dd className="text-foreground">
              {sale.currency} {fmtMoney(Number(sale.initialPriceAmount))}
            </dd>
          </div>
        )}
        {sale.saleAmount && (
          <div>
            <dt className="text-muted">Precio de cierre</dt>
            <dd className="text-foreground">
              {sale.currency} {fmtMoney(Number(sale.saleAmount))}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-muted">Comisión acordada</dt>
          <dd className="font-medium text-foreground">
            {sale.currency} {fmtMoney(Number(sale.commissionAmount))}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Cobrado hasta ahora</dt>
          <dd className="font-medium text-foreground">
            {sale.currency} {fmtMoney(totalCobrado)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Fecha de cierre</dt>
          <dd className="text-foreground">{fmtDate.format(sale.closedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted">Agente vendedor</dt>
          <dd className="text-foreground">{agentLabel(sale.vendedorAgent)}</dd>
        </div>
        <div>
          <dt className="text-muted">Agente captador</dt>
          <dd className="text-foreground">{agentLabel(sale.captadorAgent)}</dd>
        </div>
        {sale.notes && (
          <div className="col-span-2">
            <dt className="text-muted">Notas</dt>
            <dd className="whitespace-pre-line text-foreground">{sale.notes}</dd>
          </div>
        )}
      </dl>

      <h2 className="mb-3 mt-6 text-sm font-medium text-foreground">Cobro de la comisión</h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5">Cuota</th>
              <th className="px-4 py-2.5">Vence</th>
              <th className="px-4 py-2.5">Monto</th>
              <th className="px-4 py-2.5">Atribuida a</th>
              <th className="px-4 py-2.5">Pagaré</th>
              <th className="px-4 py-2.5">Estado</th>
              {canCollect && <th className="px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {sale.installments.map((installment) => (
              <tr key={installment.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-muted">
                  {installment.numeroCuota}/{installment.totalCuotas}
                </td>
                <td className="px-4 py-2.5 text-muted">{fmtDate.format(installment.dueDate)}</td>
                <td className="px-4 py-2.5 text-foreground">{fmtMoney(Number(installment.amount))}</td>
                <td className="px-4 py-2.5 text-muted">
                  {installment.attributedTo ? partyLabels[installment.attributedTo] : "—"}
                </td>
                <td className="px-4 py-2.5 text-muted">{installment.pagareFirmado ? "Firmado" : "Sin pagaré"}</td>
                <td className="px-4 py-2.5 text-muted">
                  {installment.status === "PAGADA" ? (
                    <>
                      Cobrada{installment.paidAt ? ` (${fmtDate.format(installment.paidAt)})` : ""}
                      {installment.method ? ` — ${methodLabels[installment.method]}` : ""}
                    </>
                  ) : (
                    "Pendiente"
                  )}
                </td>
                {canCollect && (
                  <td className="px-4 py-2.5">
                    {installment.status !== "PAGADA" && (
                      <form action={marcarCuotaPagada.bind(null, installment.id)} className="flex items-center gap-1.5">
                        <select name="method" defaultValue="TRANSFERENCIA" className="field py-1 text-xs" required>
                          <option value="EFECTIVO">Efectivo</option>
                          <option value="TRANSFERENCIA">Transferencia</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface"
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
      </div>

      <h2 className="mb-3 mt-6 text-sm font-medium text-foreground">Reparto de la comisión</h2>
      {sale.commissionScheme ? (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl border border-border p-5 text-sm">
          <div>
            <dt className="text-muted">Fondo de reserva</dt>
            <dd className="text-foreground">{fmtMoney(Number(sale.reservaAmount))}</dd>
          </div>
          <div>
            <dt className="text-muted">
              Agente fijo ({sale.commissionScheme.agenteFijo.firstName} {sale.commissionScheme.agenteFijo.lastName})
            </dt>
            <dd className="text-foreground">{fmtMoney(Number(sale.agenteFijoAmount))}</dd>
          </div>
          <div>
            <dt className="text-muted">Vendedor</dt>
            <dd className="text-foreground">{fmtMoney(Number(sale.vendedorAmount))}</dd>
          </div>
          <div>
            <dt className="text-muted">Captador</dt>
            <dd className="text-foreground">{fmtMoney(Number(sale.captadorAmount))}</dd>
          </div>
          <div className="col-span-2 border-t border-border pt-3">
            <dt className="text-muted">Inmobiliaria</dt>
            <dd className="font-medium text-foreground">{fmtMoney(Number(sale.agenciaAmount))}</dd>
          </div>
        </dl>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted">
          Todavía no hay un esquema de comisiones de Venta configurado — esta venta se guardó sin repartir.
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        Este reparto es lo que le corresponde a cada uno del total acordado, independiente de cuánto ya se cobró
        arriba — sirve de base para la liquidación al personal.
      </p>
    </div>
  );
}
