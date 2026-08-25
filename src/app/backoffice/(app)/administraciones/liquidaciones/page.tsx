import Link from "next/link";
import { getPaymentsForPeriod, paymentBreakdown } from "@/lib/alquileres";
import { requirePermission } from "@/lib/auth";
import { AdministracionesTabs } from "@/components/backoffice/AdministracionesTabs";

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const paymentStatusLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  ATRASADO: "Atrasado",
};

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  searchParams: Promise<{ mes?: string; anio?: string }>;
}

export default async function LiquidacionesPage({ searchParams }: PageProps) {
  await requirePermission("administraciones.ver");
  const sp = await searchParams;

  const now = new Date();
  const month = Number(sp.mes) || now.getUTCMonth() + 1;
  const year = Number(sp.anio) || now.getUTCFullYear();

  const payments = await getPaymentsForPeriod(month, year);

  function periodHref(m: number, y: number) {
    return `/backoffice/administraciones/liquidaciones?mes=${m}&anio=${y}`;
  }

  const prev = month === 1 ? { m: 12, y: year - 1 } : { m: month - 1, y: year };
  const next = month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year };

  return (
    <div>
      <AdministracionesTabs active="liquidaciones" />
      <h1 className="mb-6 text-xl font-semibold text-foreground">Liquidaciones</h1>

      <div className="mb-6 flex items-center gap-3">
        <Link href={periodHref(prev.m, prev.y)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface">
          ← Anterior
        </Link>
        <span className="text-sm font-medium text-foreground">
          {monthNames[month - 1]} {year}
        </span>
        <Link href={periodHref(next.m, next.y)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface">
          Siguiente →
        </Link>
      </div>

      {payments.length === 0 ? (
        <p className="text-sm text-muted">No hay liquidaciones para este período.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Propietario</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Comisión</th>
                <th className="px-4 py-3">Neto propietario</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const { total, managementFee, netForOwner } = paymentBreakdown(
                  p.items,
                  p.contract.managementFeePercent
                );
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                    <td className="px-4 py-3">
                      <Link
                        href={`/backoffice/administraciones/${p.contractId}/liquidaciones/${p.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {p.contract.unit.address}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {p.contract.owner.firstName} {p.contract.owner.lastName}
                    </td>
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
