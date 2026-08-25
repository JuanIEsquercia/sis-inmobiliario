import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getRentalCommissions } from "@/lib/caja";
import { CajaTabs } from "@/components/backoffice/CajaTabs";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

export default async function ComisionesPage() {
  await requirePermission("caja.ver");
  const commissions = await getRentalCommissions();

  return (
    <div>
      <CajaTabs active="comisiones" />
      <h1 className="mb-6 text-xl font-semibold text-foreground">Comisiones de alquiler</h1>
      <p className="mb-6 text-sm text-muted">
        Se cargan desde la ficha de cada contrato — acá solo se listan.
      </p>

      {commissions.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay comisiones de alquiler cargadas.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Contrato</th>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Monto</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">{fmtDate.format(c.earnedAt)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/backoffice/administraciones/${c.contractId}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {c.contract.unit.address} — {c.contract.tenant.firstName} {c.contract.tenant.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.agent.firstName} {c.agent.lastName}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {c.currency} {fmtMoney(Number(c.amount))}
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
