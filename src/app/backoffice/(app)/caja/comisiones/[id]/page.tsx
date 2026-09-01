import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getRentalCommissionById, agentLabel } from "@/lib/caja";
import { clientLabel } from "@/lib/alquileres";
import { AlquilerCronogramaFields } from "@/components/backoffice/AlquilerCronogramaFields";
import { confirmarCobroComisionAlquiler, registrarCronogramaAlquiler, marcarCuotaPagada } from "../../actions";

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

export default async function ComisionAlquilerDetailPage({ params }: PageProps) {
  const profile = await requirePermission("caja.ver");
  const canConfirmar = profile.permissions.includes("caja.comisiones.confirmar");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const commission = await getRentalCommissionById(numericId);
  if (!commission) notFound();

  const isRenewal = commission.origin === "RENOVACION";
  const totalCobrado = commission.installments
    .filter((i) => i.status === "PAGADA")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="max-w-6xl w-full mx-auto">
      <Link href="/backoffice/caja/comisiones" className="mb-4 inline-block text-xs font-semibold text-accent hover:underline">
        ← Volver a Comisión Alquileres
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-foreground">
        {commission.contract.unit.address} — {clientLabel(commission.contract.tenant)}
      </h1>
      <p className="mb-6 text-sm text-muted">
        <Link href={`/backoffice/administraciones/${commission.contractId}`} className="hover:underline">
          Ver contrato
        </Link>
      </p>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl border border-border p-5 text-sm">
        <div>
          <dt className="text-muted">Origen</dt>
          <dd className="text-foreground">{isRenewal ? "Renovación" : "Colocación"}</dd>
        </div>
        <div>
          <dt className="text-muted">Comisión acordada</dt>
          <dd className="font-medium text-foreground">
            {commission.currency} {fmtMoney(Number(commission.amount))}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Cobrado hasta ahora</dt>
          <dd className="font-medium text-foreground">
            {commission.currency} {fmtMoney(commission.cashMovement ? Number(commission.amount) : totalCobrado)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Fecha</dt>
          <dd className="text-foreground">{fmtDate.format(commission.earnedAt)}</dd>
        </div>
        {!isRenewal && (
          <>
            <div>
              <dt className="text-muted">Agente vendedor</dt>
              <dd className="text-foreground">{agentLabel(commission.vendedorAgent)}</dd>
            </div>
            <div>
              <dt className="text-muted">Agente captador</dt>
              <dd className="text-foreground">{agentLabel(commission.captadorAgent)}</dd>
            </div>
          </>
        )}
        {commission.notes && (
          <div className="col-span-2">
            <dt className="text-muted">Notas</dt>
            <dd className="whitespace-pre-line text-foreground">{commission.notes}</dd>
          </div>
        )}
      </dl>

      <h2 className="mb-3 mt-6 text-sm font-medium text-foreground">Cobro de la comisión</h2>

      {commission.cashMovement ? (
        <p className="rounded-xl border border-border p-5 text-sm text-muted">
          ✓ Cobrada
          {commission.cashMovement.method && ` — ${methodLabels[commission.cashMovement.method]}`}
        </p>
      ) : commission.installments.length > 0 ? (
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
                {canConfirmar && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {commission.installments.map((installment) => (
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
                  {canConfirmar && (
                    <td className="px-4 py-2.5">
                      {installment.status !== "PAGADA" && (
                        <form action={marcarCuotaPagada.bind(null, installment.id)} className="flex items-center gap-1.5">
                          <select name="method" defaultValue="TRANSFERENCIA" className="field py-1 text-xs" required>
                            <option value="EFECTIVO">Efectivo</option>
                            <option value="TRANSFERENCIA">Transferencia</option>
                          </select>
                          <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface">
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
      ) : !canConfirmar ? (
        <p className="rounded-xl border border-border p-5 text-sm text-muted">Pendiente de cobro.</p>
      ) : isRenewal ? (
        // Renovación todavía no tiene esquema de cuotas propio (ver
        // CommissionInstallmentSource) — el monto entero se confirma de una.
        <form action={confirmarCobroComisionAlquiler.bind(null, commission.id)} className="flex items-center gap-2 rounded-xl border border-border p-5">
          <select name="method" defaultValue="TRANSFERENCIA" required className="field text-sm">
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong">
            Confirmar cobro
          </button>
        </form>
      ) : (
        <form action={registrarCronogramaAlquiler.bind(null, commission.id)} className="rounded-xl border border-border p-5">
          <AlquilerCronogramaFields totalAmount={Number(commission.amount)} currency={commission.currency} />
          <button
            type="submit"
            className="mt-4 w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
          >
            Guardar cronograma
          </button>
        </form>
      )}

      {!isRenewal && (
        <>
          <h2 className="mb-3 mt-6 text-sm font-medium text-foreground">Reparto de la comisión</h2>
          {commission.commissionScheme ? (
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl border border-border p-5 text-sm">
              <div>
                <dt className="text-muted">Fondo de reserva</dt>
                <dd className="text-foreground">{fmtMoney(Number(commission.reservaAmount))}</dd>
              </div>
              <div>
                <dt className="text-muted">
                  Agente fijo ({commission.commissionScheme.agenteFijo.firstName}{" "}
                  {commission.commissionScheme.agenteFijo.lastName})
                </dt>
                <dd className="text-foreground">{fmtMoney(Number(commission.agenteFijoAmount))}</dd>
              </div>
              <div>
                <dt className="text-muted">Vendedor</dt>
                <dd className="text-foreground">{fmtMoney(Number(commission.vendedorAmount))}</dd>
              </div>
              <div>
                <dt className="text-muted">Captador</dt>
                <dd className="text-foreground">{fmtMoney(Number(commission.captadorAmount))}</dd>
              </div>
              <div className="col-span-2 border-t border-border pt-3">
                <dt className="text-muted">Inmobiliaria</dt>
                <dd className="font-medium text-foreground">{fmtMoney(Number(commission.agenciaAmount))}</dd>
              </div>
            </dl>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted">
              Todavía no hay un esquema de comisiones de Alquiler configurado — esta comisión se guardó sin repartir.
            </p>
          )}
        </>
      )}
    </div>
  );
}
