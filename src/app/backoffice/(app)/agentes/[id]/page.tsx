import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withRetry } from "@/lib/db-retry";
import { requireSelfOrAgentesVerTodos, requireProfile } from "@/lib/auth";
import {
  getAgentDebtItems,
  getAgentDebtPayments,
  summarizeAgentBalance,
  sumPaymentsByCurrency,
  filterPaymentsByMonth,
} from "@/lib/agentes";
import { PagarDeudaDialog } from "@/components/backoffice/PagarDeudaDialog";
import { MonthPicker } from "@/components/backoffice/MonthPicker";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const sourceLabels: Record<string, string> = {
  RENTAL_COMMISSION: "Alquiler",
  SALE: "Venta",
  APPRAISAL: "Tasación",
};
const roleLabels: Record<string, string> = {
  VENDEDOR: "Vendedor",
  CAPTADOR: "Captador",
  AGENTE_FIJO: "Agente fijo",
  TASACION: "Tasación",
};
const methodLabels: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string; anio?: string }>;
}

export default async function AgenteDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  await requireSelfOrAgentesVerTodos(id);
  const viewerProfile = await requireProfile();
  const canRegistrarPago = viewerProfile.permissions.includes("agentes.pagos.crear");

  const agent = await withRetry(() =>
    prisma.profile.findUnique({ where: { id }, select: { id: true, firstName: true, lastName: true, username: true } })
  );
  if (!agent) notFound();

  const sp = await searchParams;
  const now = new Date();
  const month = Number(sp.mes) || now.getUTCMonth() + 1;
  const year = Number(sp.anio) || now.getUTCFullYear();
  const monthFilter = { month, year };

  const [debtItems, payments] = await Promise.all([getAgentDebtItems(id), getAgentDebtPayments(id)]);
  const balances = summarizeAgentBalance(debtItems, payments);
  const pagadoEnMes = sumPaymentsByCurrency(payments, monthFilter);
  const paymentsEnMes = filterPaymentsByMonth(payments, monthFilter);

  return (
    <div className="max-w-4xl">
      {viewerProfile.permissions.includes("agentes.ver_todos") && (
        <Link href="/backoffice/agentes" className="mb-4 inline-block text-sm text-accent hover:underline">
          ← Pagos a agentes
        </Link>
      )}

      <h1 className="mb-1 text-xl font-semibold text-foreground">
        {agent.lastName} {agent.firstName}
      </h1>
      <p className="mb-4 text-sm text-muted">@{agent.username}</p>

      <div className="mb-6 flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Período:</span>
        <MonthPicker month={month} year={year} basePath={`/backoffice/agentes/${id}`} />
      </div>

      <div className="mb-8 flex flex-wrap gap-4">
        {balances.length === 0 ? (
          <p className="text-sm text-muted">Todavía no tiene ninguna operación con reparto asignado.</p>
        ) : (
          balances.map((b) => (
            <div key={b.currency} className="rounded-xl border border-border p-4 text-sm">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{b.currency}</p>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-6">
                  <span className="text-muted">Devengado</span>
                  <span className="text-foreground">{fmtMoney(b.debido)}</span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span className="text-muted">Pagado (total)</span>
                  <span className="text-foreground">{fmtMoney(b.pagado)}</span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span className="text-muted">Pagado en {monthNames[month - 1]}</span>
                  <span className="text-foreground">
                    {fmtMoney(pagadoEnMes.find((p) => p.currency === b.currency)?.total ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6 border-t border-border pt-1 font-semibold">
                  <span className="text-foreground">Saldo</span>
                  <span className={b.saldo > 0 ? "text-accent" : "text-foreground"}>{fmtMoney(b.saldo)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <section className="mb-8">
        <h2 className="mb-1 text-lg font-semibold text-foreground">De dónde viene lo devengado</h2>
        <p className="mb-3 text-xs text-muted">
          Cada línea es una operación puntual — el pago se imputa a esa línea, total o parcial, no a un total
          suelto.
        </p>
        {debtItems.length === 0 ? (
          <p className="text-sm text-muted">Sin operaciones todavía.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Operación</th>
                  <th className="px-4 py-3">Devengado</th>
                  <th className="px-4 py-3">Saldo</th>
                  {canRegistrarPago && <th className="px-4 py-3">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {debtItems.map((item) => (
                  <tr
                    key={`${item.sourceType}-${item.sourceId}-${item.role}`}
                    className="border-b border-border last:border-0 hover:bg-surface"
                  >
                    <td className="px-4 py-3 text-muted">{fmtDate.format(item.date)}</td>
                    <td className="px-4 py-3 text-muted">{item.sourceLabel}</td>
                    <td className="px-4 py-3 text-muted">{item.roleLabel}</td>
                    <td className="px-4 py-3">
                      <Link href={item.href} className="text-foreground hover:underline">
                        {item.description}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {item.currency} {fmtMoney(item.amount)}
                    </td>
                    <td className="px-4 py-3">
                      {item.saldo > 0 ? (
                        <span className="font-medium text-accent">
                          {item.currency} {fmtMoney(item.saldo)}
                        </span>
                      ) : (
                        <span className="text-muted">Pagado</span>
                      )}
                    </td>
                    {canRegistrarPago && (
                      <td className="px-4 py-3">
                        {item.saldo > 0 && (
                          <PagarDeudaDialog
                            agentId={id}
                            sourceType={item.sourceType}
                            sourceId={item.sourceId}
                            role={item.role}
                            sourceLabel={item.sourceLabel}
                            roleLabel={item.roleLabel}
                            description={item.description}
                            currency={item.currency}
                            amount={item.amount}
                            saldo={item.saldo}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Pagos registrados en {monthNames[month - 1]} {year}
        </h2>
        {paymentsEnMes.length === 0 ? (
          <p className="text-sm text-muted">No se le registró ningún pago en este mes.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Imputado a</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Medio</th>
                  <th className="px-4 py-3">Notas</th>
                </tr>
              </thead>
              <tbody>
                {paymentsEnMes.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 text-muted">{fmtDate.format(p.paidAt)}</td>
                    <td className="px-4 py-3 text-muted">
                      {sourceLabels[p.sourceType]} · {roleLabels[p.role]}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {p.currency} {fmtMoney(Number(p.amount))}
                    </td>
                    <td className="px-4 py-3 text-muted">{p.method ? methodLabels[p.method] : "—"}</td>
                    <td className="px-4 py-3 text-muted">{p.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
