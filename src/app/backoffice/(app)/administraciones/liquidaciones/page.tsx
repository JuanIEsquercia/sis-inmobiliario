import Link from "next/link";
import { getPaymentsForPeriod, paymentBreakdown, clientLabel } from "@/lib/alquileres";
import { requirePermission, getContractGroupScope } from "@/lib/auth";
import { AdministracionesTabs } from "@/components/backoffice/AdministracionesTabs";
import { CobrarDialog } from "@/components/backoffice/CobrarDialog";
import { PagarPropietarioDialog } from "@/components/backoffice/PagarPropietarioDialog";
import { marcarLiquidacionEnviada } from "../actions";

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const paymentStatusLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  ENVIADA: "Enviada",
  PARCIAL: "Parcial",
  PAGADO: "Pagado",
};

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  searchParams: Promise<{ mes?: string; anio?: string }>;
}

export default async function LiquidacionesPage({ searchParams }: PageProps) {
  const profile = await requirePermission("administraciones.ver");
  const canEdit = profile.permissions.includes("administraciones.pagos");
  const scope = await getContractGroupScope(profile);
  const sp = await searchParams;

  const now = new Date();
  const month = Number(sp.mes) || now.getUTCMonth() + 1;
  const year = Number(sp.anio) || now.getUTCFullYear();

  const payments = await getPaymentsForPeriod(scope, month, year);

  function periodHref(m: number, y: number) {
    return `/backoffice/administraciones/liquidaciones?mes=${m}&anio=${y}`;
  }

  const prev = month === 1 ? { m: 12, y: year - 1 } : { m: month - 1, y: year };
  const next = month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year };

  return (
    <div>
      <AdministracionesTabs active="liquidaciones" />
      <h1 className="mb-6 text-xl font-semibold text-foreground">Liquidaciones</h1>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-surface p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Link
            href={periodHref(prev.m, prev.y)}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-surface transition-colors cursor-pointer"
          >
            ← Anterior
          </Link>

          <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-background px-4 py-2 shadow-xs">
            <svg className="h-4 w-4 text-accent flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-xs font-bold text-foreground">
              {monthNames[month - 1]} {year}
            </span>
          </div>

          <Link
            href={periodHref(next.m, next.y)}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-surface transition-colors cursor-pointer"
          >
            Siguiente →
          </Link>
        </div>
      </div>

      {payments.length === 0 ? (
        <p className="text-sm text-muted">No hay liquidaciones para este período.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Propietario</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Comisión</th>
                <th className="px-4 py-3">Neto propietario</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Saldo</th>
                {canEdit && <th className="px-4 py-3">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const { total, managementFee, netForOwner } = paymentBreakdown(
                  p.items,
                  p.contract.managementFeePercent
                );
                const saldo = total - Number(p.paidAmount ?? 0);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 text-muted">{p.contract.unit.propertyCode}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/backoffice/administraciones/${p.contractId}/liquidaciones/${p.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {p.contract.unit.address}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{clientLabel(p.contract.owner)}</td>
                    <td className="px-4 py-3 text-foreground">
                      {p.currency} {fmtMoney(total)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {p.currency} {fmtMoney(managementFee)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {p.currency} {fmtMoney(netForOwner)}
                    </td>
                    <td className="px-4 py-3 text-muted">{paymentStatusLabels[p.status]}</td>
                    <td className="px-4 py-3 text-muted">
                      {p.status === "PARCIAL" ? `${p.currency} ${fmtMoney(saldo)}` : "—"}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        {p.status === "PENDIENTE" && (
                          <form action={marcarLiquidacionEnviada.bind(null, p.id)}>
                            <button
                              type="submit"
                              className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface"
                            >
                              Marcar enviada
                            </button>
                          </form>
                        )}
                        {(p.status === "ENVIADA" || p.status === "PARCIAL") && (
                          <CobrarDialog
                            paymentId={p.id}
                            propertyCode={p.contract.unit.propertyCode}
                            address={p.contract.unit.address}
                            tenantName={clientLabel(p.contract.tenant)}
                            periodLabel={`${monthNames[p.periodMonth - 1]} ${p.periodYear}`}
                            currency={p.currency}
                            total={total}
                            saldo={saldo}
                          />
                        )}
                        {p.status === "PAGADO" &&
                          (p.ownerPaidAt ? (
                            <span className="text-xs text-muted">✓ Propietario pagado</span>
                          ) : (
                            <PagarPropietarioDialog
                              paymentId={p.id}
                              propertyCode={p.contract.unit.propertyCode}
                              address={p.contract.unit.address}
                              ownerName={clientLabel(p.contract.owner)}
                              periodLabel={`${monthNames[p.periodMonth - 1]} ${p.periodYear}`}
                              currency={p.currency}
                              netAmount={netForOwner}
                            />
                          ))}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
