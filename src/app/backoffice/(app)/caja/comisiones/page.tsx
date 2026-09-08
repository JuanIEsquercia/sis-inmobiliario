import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getRentalCommissions, agentLabel } from "@/lib/caja";
import { clientLabel } from "@/lib/alquileres";
import { CajaTabs } from "@/components/backoffice/CajaTabs";
import { ResponsiveDataGrid } from "@/components/backoffice/ResponsiveDataGrid";

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
    <div className="space-y-6">
      <CajaTabs active="comisiones" />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">Comisiones de Alquileres</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed max-w-3xl">
            Comisiones por colocación y renovación de alquileres. Suma a la Caja una vez confirmado el cobro.
          </p>
        </div>
        {profile.permissions.includes("administraciones.crear") && (
          <Link
            href="/backoffice/administraciones/nuevo"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-xs font-bold uppercase tracking-wider text-accent-foreground transition-all hover:bg-accent-strong hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm shadow-accent/10 shrink-0"
          >
            Cargar alquiler
          </Link>
        )}
      </div>

      <ResponsiveDataGrid
        isEmpty={commissions.length === 0}
        emptyMessage="Todavía no hay comisiones de alquiler cargadas."
        mobileCards={
          <>
            {commissions.map((c) => {
              const cobroState = c.cashMovement
                ? "✓ Cobrada"
                : c.installments.length > 0
                  ? c.installments.every((i) => i.status === "PAGADA")
                    ? "✓ Cobrada"
                    : `${c.installments.filter((i) => i.status === "PAGADA").length}/${c.installments.length} cuotas cobradas`
                  : "Pendiente";

              const isCobrada = cobroState.includes("✓");

              return (
                <div key={c.id} className="rounded-2xl border border-border/60 bg-surface p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-2.5">
                    <div>
                      <span className="font-mono text-xs font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-lg">
                        {originLabels[c.origin] ?? c.origin}
                      </span>
                      <Link
                        href={`/backoffice/caja/comisiones/${c.id}`}
                        className="font-bold text-foreground hover:text-accent transition-colors text-base block mt-1"
                      >
                        {c.contract.unit.address} — {clientLabel(c.contract.tenant)}
                      </Link>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isCobrada
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {cobroState}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Vendedor</span>
                      <span className="font-semibold text-foreground truncate block">
                        {c.origin === "RENOVACION" ? "—" : agentLabel(c.vendedorAgent)}
                      </span>
                    </div>
                    <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Captador</span>
                      <span className="font-semibold text-foreground truncate block">
                        {c.origin === "RENOVACION" ? "—" : agentLabel(c.captadorAgent)}
                      </span>
                    </div>
                    <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Monto</span>
                      <span className="font-extrabold text-foreground">
                        {c.currency} {fmtMoney(Number(c.amount))}
                      </span>
                    </div>
                    <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                      <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Fecha</span>
                      <span className="font-semibold text-foreground">{fmtDate.format(c.earnedAt)}</span>
                    </div>
                  </div>

                  <div>
                    <Link
                      href={`/backoffice/caja/comisiones/${c.id}`}
                      className="flex h-10 w-full items-center justify-center rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-background transition-colors"
                    >
                      Ver Detalle de Comisión
                    </Link>
                  </div>
                </div>
              );
            })}
          </>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Contrato</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Vendedor</th>
                <th className="px-4 py-3">Captador</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3 text-right">Cobro</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted font-medium">{fmtDate.format(c.earnedAt)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/backoffice/caja/comisiones/${c.id}`}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {c.contract.unit.address} — {clientLabel(c.contract.tenant)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{originLabels[c.origin] ?? c.origin}</td>
                  <td className="px-4 py-3 text-muted font-medium">
                    {c.origin === "RENOVACION" ? "—" : agentLabel(c.vendedorAgent)}
                  </td>
                  <td className="px-4 py-3 text-muted font-medium">
                    {c.origin === "RENOVACION" ? "—" : agentLabel(c.captadorAgent)}
                  </td>
                  <td className="px-4 py-3 font-bold text-foreground">
                    {c.currency} {fmtMoney(Number(c.amount))}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-muted">
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
        }
      />
    </div>
  );
}
