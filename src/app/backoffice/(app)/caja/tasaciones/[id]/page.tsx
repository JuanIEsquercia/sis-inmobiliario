import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getAppraisalById } from "@/lib/caja";
import { getSignedDocumentUrl } from "@/lib/supabase/storage";
import { subirInformeTasacion, confirmarCobroTasacion } from "../../actions";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TasacionDetailPage({ params }: PageProps) {
  const profile = await requirePermission("caja.ver");
  const canUpload = profile.permissions.includes("caja.tasaciones.crear");
  const canConfirmar = profile.permissions.includes("caja.tasaciones.confirmar");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const appraisal = await getAppraisalById(numericId);
  if (!appraisal) notFound();

  const reportUrl = appraisal.reportStoragePath ? await getSignedDocumentUrl(appraisal.reportStoragePath) : null;

  return (
    <div className="max-w-xl">
      <Link href="/backoffice/caja/tasaciones" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← Tasaciones
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-foreground">
        {appraisal.unit.propertyCode} — {appraisal.unit.address}
      </h1>
      <p className="mb-6 text-sm text-muted">
        <Link href={`/backoffice/historial/${appraisal.unitId}`} className="hover:underline">
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
          <dt className="text-muted">Reparto</dt>
          <dd className="text-foreground">
            {appraisal.agent ? (
              <>
                50/50 con {appraisal.agent.firstName} {appraisal.agent.lastName} —{" "}
                {fmtMoney(Number(appraisal.agentAmount))} c/u
              </>
            ) : (
              "100% inmobiliaria"
            )}
          </dd>
        </div>
        {appraisal.notes && (
          <div className="col-span-2">
            <dt className="text-muted">Notas</dt>
            <dd className="whitespace-pre-line text-foreground">{appraisal.notes}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6 rounded-xl border border-border p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Cobro</h2>
        {appraisal.cashMovement ? (
          <p className="text-sm text-muted">
            ✓ Cobrada
            {appraisal.cashMovement.method &&
              ` — ${appraisal.cashMovement.method === "EFECTIVO" ? "Efectivo" : "Transferencia"}`}
          </p>
        ) : canConfirmar ? (
          <form action={confirmarCobroTasacion.bind(null, appraisal.id)} className="flex items-center gap-2">
            <select name="method" defaultValue="TRANSFERENCIA" required className="field text-sm">
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
            >
              Confirmar cobro
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted">Pendiente de cobro.</p>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-border p-5">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Informe de tasación</h2>
        {appraisal.reportStoragePath ? (
          <p className="mb-4 text-sm">
            {reportUrl ? (
              <a href={reportUrl} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
                {appraisal.reportFileName}
              </a>
            ) : (
              appraisal.reportFileName
            )}
            {appraisal.reportUploadedAt && (
              <span className="ml-1.5 text-muted">— subido el {fmtDate.format(appraisal.reportUploadedAt)}</span>
            )}
          </p>
        ) : (
          <p className="mb-4 text-sm text-muted">Todavía no se subió el informe.</p>
        )}

        {canUpload && (
          <form action={subirInformeTasacion.bind(null, appraisal.id)} className="flex flex-col gap-3 border-t border-border/60 pt-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="file" className="text-xs text-muted">
                {appraisal.reportStoragePath ? "Reemplazar informe (PDF, máx. 10MB)" : "Archivo (PDF, máx. 10MB)"}
              </label>
              <input id="file" name="file" type="file" accept="application/pdf" required className="field w-full text-sm" />
            </div>
            <button
              type="submit"
              className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
            >
              {appraisal.reportStoragePath ? "Reemplazar informe" : "Subir informe"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
