import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getAppraisalById } from "@/lib/caja";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TasacionDetailPage({ params }: PageProps) {
  await requirePermission("caja.ver");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const appraisal = await getAppraisalById(numericId);
  if (!appraisal) notFound();

  return (
    <div className="max-w-xl">
      <Link href="/backoffice/caja/tasaciones" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← Tasaciones
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-foreground">
        {appraisal.unit.propertyCode} — {appraisal.unit.address}
      </h1>
      <p className="mb-6 text-sm text-muted">
        <Link href={`/backoffice/administraciones/unidades/${appraisal.unitId}`} className="hover:underline">
          Ver historial de la propiedad
        </Link>
      </p>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl border border-border p-5 text-sm">
        <div>
          <dt className="text-muted">Monto</dt>
          <dd className="font-medium text-foreground">
            {appraisal.currency} {fmtMoney(Number(appraisal.amount))}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Fecha</dt>
          <dd className="text-foreground">{fmtDate.format(appraisal.completedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted">Tasador</dt>
          <dd className="text-foreground">
            {appraisal.agent.firstName} {appraisal.agent.lastName}
          </dd>
        </div>
        {appraisal.notes && (
          <div className="col-span-2">
            <dt className="text-muted">Notas</dt>
            <dd className="whitespace-pre-line text-foreground">{appraisal.notes}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
