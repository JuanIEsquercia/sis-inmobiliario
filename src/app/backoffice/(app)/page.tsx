import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requireProfile, getContractGroupScope, contractGroupWhere } from "@/lib/auth";
import {
  getPendingCollectionsSummary,
  getLoadedThisMonth,
  getUnifiedPendingList,
  getAlertsSummary,
  pendingTypeLabels,
  type CurrencyAmount,
  type PendingBucket,
  type PendingItemType,
} from "@/lib/dashboard";
import { KpiStatCard } from "@/components/backoffice/KpiStatCard";

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

function formatAmounts(amounts: CurrencyAmount[]): string | undefined {
  if (amounts.length === 0) return undefined;
  return amounts.map((a) => `${a.currency} ${fmtMoney(a.amount)}`).join(" · ");
}

// El número grande de la tarjeta es `operations` (ventas/comisiones
// DISTINTAS), no `count` (cuotas) — una venta con la comisión partida
// en 2 pagos tiene que leerse como "1 venta pendiente", no como "2
// ventas". Las cuotas, cuando hay más de una por operación, van en el
// subtítulo como aclaración.
function pendingCardSubtitle(bucket: PendingBucket, cuotaWord: string): string {
  const amountsText = formatAmounts(bucket.amounts);
  if (!amountsText) return "Sin pendientes";
  if (bucket.count === bucket.operations) return amountsText;
  return `${bucket.count} ${cuotaWord} · ${amountsText}`;
}

const pendingTypeBadge: Record<PendingItemType, { label: string; variant: "accent" | "warning" | "neutral" | "danger" }> = {
  VENTA: { label: "Venta", variant: "accent" },
  ALQUILER: { label: "Comisión alquiler", variant: "warning" },
  TASACION: { label: "Tasación", variant: "neutral" },
  ADMINISTRACION: { label: "Liquidación", variant: "danger" },
};

const icons = {
  pedidos: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.008m0-.008a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM9 12v.008m0-.008a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM9 7.5v.008m0-.008a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
    </svg>
  ),
  contratos: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
  liquidaciones: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    </svg>
  ),
  ventas: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 11.204 3.045a1.125 1.125 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </svg>
  ),
  alquileres: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h.008M20.25 12h-.008M12 3.75v.008M12 20.25v-.008M6.166 6.166l.005.005M17.834 17.834l.005.005M6.166 17.834l.005-.005M17.834 6.166l.005-.005" />
    </svg>
  ),
  tasaciones: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7.5h6M9 12h6M9 16.5h3M5.25 3.75h13.5A1.5 1.5 0 0 1 20.25 5.25v13.5a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z" />
    </svg>
  ),
  alerta: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
};

export default async function BackofficeDashboard() {
  const profile = await requireProfile();
  const scope = await getContractGroupScope(profile);
  const canPedidos = profile.permissions.includes("pedidos.ver");
  const canAdmin = profile.permissions.includes("administraciones.ver");
  const canCaja = profile.permissions.includes("caja.ver");

  const [pedidosAbiertos, contratosActivos, pagosPendientes, collectionsSummary, loadedThisMonth, pendingList, alertsSummary] =
    await withRetry(() =>
      Promise.all([
        canPedidos ? prisma.pedido.count({ where: { estado: { in: ["ABIERTO", "EN_BUSQUEDA"] } } }) : Promise.resolve(0),
        canAdmin
          ? prisma.contract.count({ where: { status: "ACTIVO", isAdministered: true, ...(contractGroupWhere(scope) ?? {}) } })
          : Promise.resolve(0),
        canAdmin
          ? prisma.payment.count({
              where: {
                status: { in: ["PENDIENTE", "ENVIADA", "PARCIAL"] },
                ...(contractGroupWhere(scope) ? { contract: { OR: [{ isAdministered: false }, contractGroupWhere(scope)!] } } : {}),
              },
            })
          : Promise.resolve(0),
        canCaja ? getPendingCollectionsSummary() : Promise.resolve(null),
        canCaja || canAdmin ? getLoadedThisMonth() : Promise.resolve(null),
        canCaja || canAdmin ? getUnifiedPendingList(scope) : Promise.resolve([]),
        canAdmin || canCaja ? getAlertsSummary(scope, { canAdmin, canCaja }) : Promise.resolve(null),
      ])
    );

  // Cada tipo de la lista unificada pide su propio permiso — a alguien
  // sin caja.ver no le sirve ver "3 cuotas de venta pendientes" si ni
  // siquiera puede entrar a confirmarlas.
  const visiblePendingList = pendingList.filter((item) =>
    item.type === "ADMINISTRACION" ? canAdmin : canCaja
  );

  const showAlertas = (canAdmin || canCaja) && alertsSummary !== null;

  return (
    <div className="flex flex-col gap-10">
      {showAlertas && alertsSummary && (
        <div>
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted">Alertas</h2>
          <p className="mb-4 text-xs text-muted/80">Lo que ya venció o está por vencer, para no perderlo de vista.</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {canAdmin && (
              <Link href="/backoffice/administraciones/actualizaciones" className="block">
                <KpiStatCard
                  title="Actualizaciones atrasadas"
                  value={alertsSummary.actualizaciones.count}
                  subtitle="Contratos con la indexación vencida sin aplicar"
                  icon={icons.alerta}
                  badge={
                    alertsSummary.actualizaciones.count > 0
                      ? { label: "Atrasado", variant: "danger" }
                      : { label: "Al día", variant: "success" }
                  }
                />
              </Link>
            )}
            {canAdmin && (
              <Link href="/backoffice/administraciones/actualizaciones" className="block">
                <KpiStatCard
                  title="Contratos por vencer"
                  value={alertsSummary.vencimientos.count}
                  subtitle="Vencen dentro de los próximos 60 días"
                  icon={icons.contratos}
                  badge={
                    alertsSummary.vencimientos.count > 0
                      ? { label: "Revisar", variant: "warning" }
                      : { label: "Sin novedad", variant: "success" }
                  }
                />
              </Link>
            )}
            {(canCaja || canAdmin) && (
              <Link href="#pendientes-cobro" className="block">
                <KpiStatCard
                  title="Cobros atrasados"
                  value={alertsSummary.cobros.count}
                  subtitle={formatAmounts(alertsSummary.cobros.amounts) ?? "Sin cobros atrasados"}
                  icon={icons.alerta}
                  badge={
                    alertsSummary.cobros.count > 0
                      ? { label: "Atrasado", variant: "danger" }
                      : { label: "Al día", variant: "success" }
                  }
                />
              </Link>
            )}
          </div>
        </div>
      )}

      <div>
        <h1 className="mb-6 text-xl font-bold tracking-tight text-foreground uppercase">Resumen del Panel</h1>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {canPedidos && (
            <Link href="/backoffice/pedidos" className="block">
              <KpiStatCard title="Pedidos abiertos" value={pedidosAbiertos} icon={icons.pedidos} />
            </Link>
          )}
          {canAdmin && (
            <Link href="/backoffice/administraciones" className="block">
              <KpiStatCard title="Contratos activos" value={contratosActivos} icon={icons.contratos} />
            </Link>
          )}
          {canAdmin && (
            <Link href="/backoffice/administraciones/liquidaciones" className="block">
              <KpiStatCard
                title="Liquidaciones pendientes"
                value={pagosPendientes}
                icon={icons.liquidaciones}
                badge={pagosPendientes > 0 ? { label: "Revisar", variant: "warning" } : undefined}
              />
            </Link>
          )}
        </div>
      </div>

      {collectionsSummary && (
        <div>
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted">Cobros pendientes por operación</h2>
          <p className="mb-4 text-xs text-muted/80">Comisiones y tasaciones ya devengadas que todavía no se cobraron.</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Link href="/backoffice/caja/ventas" className="block">
              <KpiStatCard
                title="Ventas"
                value={collectionsSummary.ventas.operations}
                subtitle={pendingCardSubtitle(collectionsSummary.ventas, "cuotas")}
                icon={icons.ventas}
                badge={collectionsSummary.ventas.count > 0 ? { label: "Pendiente", variant: "warning" } : { label: "Al día", variant: "success" }}
              />
            </Link>
            <Link href="/backoffice/caja/comisiones" className="block">
              <KpiStatCard
                title="Alquileres (comisión)"
                value={collectionsSummary.alquileres.operations}
                subtitle={pendingCardSubtitle(collectionsSummary.alquileres, "cuotas/pagos")}
                icon={icons.alquileres}
                badge={collectionsSummary.alquileres.count > 0 ? { label: "Pendiente", variant: "warning" } : { label: "Al día", variant: "success" }}
              />
            </Link>
            <Link href="/backoffice/caja/tasaciones" className="block">
              <KpiStatCard
                title="Tasaciones"
                value={collectionsSummary.tasaciones.operations}
                subtitle={pendingCardSubtitle(collectionsSummary.tasaciones, "tasaciones")}
                icon={icons.tasaciones}
                badge={collectionsSummary.tasaciones.count > 0 ? { label: "Pendiente", variant: "warning" } : { label: "Al día", variant: "success" }}
              />
            </Link>
          </div>
        </div>
      )}

      {loadedThisMonth && (
        <div>
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted">Cargado este mes</h2>
          <p className="mb-4 text-xs text-muted/80">Pulso de carga — operaciones nuevas ingresadas al sistema, no cerradas.</p>
          <div className="flex flex-wrap gap-x-8 gap-y-3 rounded-2xl border border-border/60 bg-surface p-5 shadow-sm">
            {canCaja && (
              <>
                <div>
                  <p className="text-2xl font-extrabold text-foreground">{loadedThisMonth.ventas}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Ventas</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-foreground">{loadedThisMonth.tasaciones}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Tasaciones</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-foreground">{loadedThisMonth.alquileresColocados}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Alquileres colocados</p>
                </div>
              </>
            )}
            {canAdmin && (
              <div>
                <p className="text-2xl font-extrabold text-foreground">{loadedThisMonth.contratosAdministrados}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Contratos administrados</p>
              </div>
            )}
          </div>
        </div>
      )}

      {visiblePendingList.length > 0 && (
        <div id="pendientes-cobro" className="scroll-mt-6">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted">Pendientes de cobro</h2>
          <p className="mb-4 text-xs text-muted/80">
            Todo lo que falta cobrar, de todas las operaciones — ordenado por lo más atrasado primero.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Propiedad</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3">Vencimiento</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {visiblePendingList.map((item) => {
                  const badge = pendingTypeBadge[item.type];
                  return (
                    <tr key={`${item.type}-${item.id}`} className="border-b border-border last:border-0 hover:bg-surface">
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          badge.variant === "accent" ? "bg-accent/10 text-accent border-accent/20"
                          : badge.variant === "warning" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : badge.variant === "danger" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          : "bg-muted/10 text-muted border-border/50"
                        }`}>
                          {pendingTypeLabels[item.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{item.label}</td>
                      <td className="px-4 py-3 text-muted">{item.sublabel}</td>
                      <td className="px-4 py-3">
                        <span className={item.isOverdue ? "font-semibold text-rose-600 dark:text-rose-400" : "text-muted"}>
                          {fmtDate.format(item.dueDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {item.currency} {fmtMoney(item.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={item.href} className="text-xs font-semibold text-accent hover:underline">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
