import { notFound } from "next/navigation";
import { getContractById } from "@/lib/alquileres";
import { requirePermission } from "@/lib/auth";
import { registrarPago, aplicarIndexacion } from "../actions";

const statusLabels: Record<string, string> = {
  ACTIVO: "Activo",
  FINALIZADO: "Finalizado",
  RESCINDIDO: "Rescindido",
};

const paymentStatusLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  ATRASADO: "Atrasado",
};

const monthNames = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractDetailPage({ params }: PageProps) {
  const profile = await requirePermission("alquileres.ver");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const contract = await getContractById(numericId);
  if (!contract) notFound();

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{contract.unit.address}</h1>
          <p className="text-sm text-muted">
            {contract.tenant.fullName} (inquilino) · {contract.owner.fullName} (propietario)
          </p>
        </div>
        <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-foreground">
          {statusLabels[contract.status]}
        </span>
      </div>

      <dl className="mb-8 grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl border border-border p-5 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Alquiler actual</dt>
          <dd className="font-medium text-foreground">
            {contract.currency} {contract.rentAmount.toString()}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Vigencia</dt>
          <dd className="text-foreground">
            {fmtDate.format(contract.startDate)} — {fmtDate.format(contract.endDate)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Actualización</dt>
          <dd className="text-foreground">
            {contract.indexationFrequencyMonths
              ? `Cada ${contract.indexationFrequencyMonths} meses${contract.indexationType ? ` (${contract.indexationType})` : ""}`
              : "No aplica"}
          </dd>
        </div>
        {contract.nextIndexationDueAt && (
          <div>
            <dt className="text-muted">Próxima actualización</dt>
            <dd className="text-foreground">{fmtDate.format(contract.nextIndexationDueAt)}</dd>
          </div>
        )}
        {contract.notes && (
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-muted">Notas</dt>
            <dd className="whitespace-pre-line text-foreground">{contract.notes}</dd>
          </div>
        )}
      </dl>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Pagos</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5">Período</th>
                <th className="px-4 py-2.5">Vence</th>
                <th className="px-4 py-2.5">Monto</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {contract.payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-foreground">
                    {monthNames[p.periodMonth - 1]} {p.periodYear}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{fmtDate.format(p.dueDate)}</td>
                  <td className="px-4 py-2.5 text-foreground">
                    {p.currency} {p.amount.toString()}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{paymentStatusLabels[p.status]}</td>
                  <td className="px-4 py-2.5">
                    {p.status !== "PAGADO" && profile.permissions.includes("alquileres.pagos") && (
                      <form action={registrarPago.bind(null, p.id, contract.id)}>
                        <button type="submit" className="rounded-full border border-border px-3 py-1 text-xs hover:bg-surface">
                          Marcar pagado
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Indexación</h2>

        {contract.indexations.length > 0 && (
          <ul className="mb-4 flex flex-col gap-1.5 text-sm">
            {contract.indexations.map((i) => (
              <li key={i.id} className="text-muted">
                {fmtDate.format(i.appliedAt)}: {contract.currency} {i.previousAmount.toString()} →{" "}
                <span className="text-foreground">{contract.currency} {i.newAmount.toString()}</span>
                {i.index ? ` (${i.index})` : ""}
              </li>
            ))}
          </ul>
        )}

        {profile.permissions.includes("alquileres.indexacion") && (
          <form action={aplicarIndexacion.bind(null, contract.id)} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="newAmount" className="text-xs text-muted">
                Nuevo monto
              </label>
              <input id="newAmount" name="newAmount" type="number" step="0.01" required className="field w-32" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="index" className="text-xs text-muted">
                Índice usado
              </label>
              <input id="index" name="index" placeholder="Ej. ICL agosto 2026" className="field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="idxNotes" className="text-xs text-muted">
                Notas
              </label>
              <input id="idxNotes" name="notes" className="field" />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
            >
              Aplicar actualización
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
