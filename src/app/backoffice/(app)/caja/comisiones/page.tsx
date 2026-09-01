import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getRentalCommissions, agentLabel } from "@/lib/caja";
import { clientLabel } from "@/lib/alquileres";
import { CajaTabs } from "@/components/backoffice/CajaTabs";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

const originLabels: Record<string, string> = {
  ALQUILER: "Colocación",
  RENOVACION: "Renovación",
};

export default async function ComisionesPage() {
  const profile = await requirePermission("caja.ver");
  const commissions = await getRentalCommissions();

  return (
    <div>
      <CajaTabs active="comisiones" />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Alquileres</h1>
        {profile.permissions.includes("administraciones.crear") && (
          <Link
            href="/backoffice/administraciones/nuevo"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
          >
            Cargar alquiler
          </Link>
        )}
      </div>
      <p className="mb-6 text-sm text-muted">
        Se cargan desde &quot;Cargar alquiler&quot; (mismo alta que un contrato, con o sin administración) o después,
        desde la ficha de ese contrato. Colocación y Renovación son unidades de negocio distintas: solo la
        colocación reparte entre agente vendedor/captador. Cargar la comisión no la da por cobrada — colocar el
        alquiler y cobrar la comisión suelen pasar en momentos distintos, así que recién suma a Caja cuando se
        confirma el cobro.
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
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Captador</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Cobro</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">{fmtDate.format(c.earnedAt)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/backoffice/caja/comisiones/${c.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {c.contract.unit.address} — {clientLabel(c.contract.tenant)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{originLabels[c.origin] ?? c.origin}</td>
                  <td className="px-4 py-3 text-muted">
                    {c.origin === "RENOVACION" ? "—" : agentLabel(c.vendedorAgent)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.origin === "RENOVACION" ? "—" : agentLabel(c.captadorAgent)}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {c.currency} {fmtMoney(Number(c.amount))}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {c.cashMovement
                      ? "✓ Cobrada"
                      : c.installments.length > 0
                        ? c.installments.every((i) => i.status === "PAGADA")
                          ? "✓ Cobrada"
                          : `${c.installments.filter((i) => i.status === "PAGADA").length}/${c.installments.length} cuotas cobradas`
                        : "Pendiente"}
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
