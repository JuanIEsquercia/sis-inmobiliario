import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getSales } from "@/lib/caja";
import { CajaTabs } from "@/components/backoffice/CajaTabs";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

export default async function VentasPage() {
  const profile = await requirePermission("caja.ver");
  const sales = await getSales();

  return (
    <div>
      <CajaTabs active="ventas" />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Ventas</h1>
        {profile.permissions.includes("caja.ventas.crear") && (
          <Link
            href="/backoffice/caja/ventas/nueva"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
          >
            Nueva venta
          </Link>
        )}
      </div>

      {sales.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay ventas cargadas.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Propiedad</th>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Comisión</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">{fmtDate.format(s.closedAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/backoffice/caja/ventas/${s.id}`} className="font-medium text-foreground hover:underline">
                      {s.unit.propertyCode} — {s.unit.address}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {s.agent.firstName} {s.agent.lastName}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {s.currency} {fmtMoney(Number(s.commissionAmount))}
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
