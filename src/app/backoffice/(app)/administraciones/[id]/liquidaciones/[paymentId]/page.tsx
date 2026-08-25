import { notFound } from "next/navigation";
import Link from "next/link";
import { getPaymentById, paymentTotal } from "@/lib/alquileres";
import { requirePermission } from "@/lib/auth";
import { guardarLiquidacion, marcarLiquidacionPagada } from "../../../actions";

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

const paymentStatusLabels: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  ATRASADO: "Atrasado",
};

interface PageProps {
  params: Promise<{ id: string; paymentId: string }>;
}

export default async function LiquidacionDetailPage({ params }: PageProps) {
  const profile = await requirePermission("administraciones.ver");
  const { id, paymentId } = await params;
  const numericPaymentId = Number(paymentId);
  if (!Number.isFinite(numericPaymentId)) notFound();

  const payment = await getPaymentById(numericPaymentId);
  if (!payment || String(payment.contractId) !== id) notFound();

  const canEdit = profile.permissions.includes("administraciones.pagos");
  const isPaid = payment.status === "PAGADO";

  return (
    <div className="max-w-xl">
      <Link href={`/backoffice/administraciones/${id}`} className="mb-4 inline-block text-sm text-accent hover:underline">
        ← {payment.contract.unit.address}
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {monthNames[payment.periodMonth - 1]} {payment.periodYear}
          </h1>
          <p className="text-sm text-muted">
            Vence {fmtDate.format(payment.dueDate)} · {payment.contract.tenant.firstName} {payment.contract.tenant.lastName}
          </p>
        </div>
        <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-foreground">
          {paymentStatusLabels[payment.status]}
        </span>
      </div>

      <form action={guardarLiquidacion.bind(null, payment.id)} className="mb-4 flex flex-col gap-3 rounded-xl border border-border p-4">
        {payment.items.map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr_140px_1fr] items-center gap-3">
            <span className="text-sm text-foreground">{item.concept.name}</span>
            <input type="hidden" name="itemId" value={item.id} />
            <input
              name={`amount.${item.id}`}
              type="number"
              step="0.01"
              defaultValue={item.amount ? item.amount.toString() : ""}
              placeholder="Monto"
              disabled={!canEdit || isPaid}
              className="field"
            />
            <input
              name={`notes.${item.id}`}
              defaultValue={item.notes ?? ""}
              placeholder="Notas (opcional)"
              disabled={!canEdit || isPaid}
              className="field"
            />
          </div>
        ))}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-medium text-foreground">
            Total: {payment.currency} {paymentTotal(payment.items).toLocaleString("es-AR")}
          </span>
          {canEdit && !isPaid && (
            <button
              type="submit"
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
            >
              Guardar montos
            </button>
          )}
        </div>
      </form>

      {canEdit && !isPaid && (
        <form action={marcarLiquidacionPagada.bind(null, payment.id)}>
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
          >
            Marcar liquidación como pagada
          </button>
        </form>
      )}

      {isPaid && payment.paidAt && (
        <p className="text-sm text-muted">
          Pagada el {fmtDate.format(payment.paidAt)} — total registrado: {payment.currency}{" "}
          {payment.paidAmount?.toString()}
        </p>
      )}
    </div>
  );
}
