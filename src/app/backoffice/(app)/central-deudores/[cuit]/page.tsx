import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getCreditChecksByCuit, consultantLabel } from "@/lib/central-deudores";
import { SITUACION_LABELS, situacionColorClass } from "@/lib/bcra";
import { ConfirmDeleteButton } from "@/components/backoffice/ConfirmDeleteButton";
import { consultarCreditCheck, eliminarCreditCheck } from "../actions";

const fmtDateTime = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

interface PageProps {
  params: Promise<{ cuit: string }>;
}

// Historial completo de un CUIT — todas las consultas guardadas, no
// solo la última (ver comentario en el modelo CreditCheck): es el
// resguardo si un agente se olvidó de adjuntar el PDF al contrato en su
// momento, o si hace falta volver a ver qué decía el BCRA en una fecha
// puntual.
export default async function HistorialCreditCheckPage({ params }: PageProps) {
  await requirePermission("administraciones.crear");
  const { cuit } = await params;

  const checks = await getCreditChecksByCuit(cuit);
  if (checks.length === 0) notFound();

  const denominacion = checks.find((c) => c.denominacion)?.denominacion ?? null;

  return (
    <div>
      <Link href="/backoffice/central-deudores" className="mb-4 inline-block text-sm text-muted hover:underline">
        ← Volver a Central de Deudores
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{denominacion ?? "Sin denominación AFIP"}</h1>
          <p className="font-mono text-sm text-muted">CUIT/CUIL {cuit}</p>
        </div>
        <form action={consultarCreditCheck}>
          <input type="hidden" name="cuit" value={cuit} />
          <button type="submit" className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong">
            Consultar de nuevo
          </button>
        </form>
      </div>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">
        Historial de consultas ({checks.length})
      </h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Situación</th>
              <th className="px-4 py-3">Consultado por</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface">
                <td className="px-4 py-3 text-muted">{fmtDateTime.format(c.consultedAt)}</td>
                <td className="px-4 py-3">
                  {!c.found ? (
                    <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted">Sin antecedentes</span>
                  ) : c.situacionActual === null ? (
                    <span className="text-xs text-muted">—</span>
                  ) : (
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${situacionColorClass(c.situacionActual)}`}>
                      Situación {c.situacionActual} — {SITUACION_LABELS[c.situacionActual]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{consultantLabel(c.consultedBy)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/backoffice/central-deudores/${cuit}/${c.id}`}
                      className="rounded-lg border border-border px-2 py-1 text-xs text-muted hover:bg-surface hover:text-foreground"
                    >
                      Ver detalle
                    </Link>
                    <ConfirmDeleteButton
                      action={eliminarCreditCheck.bind(null, cuit, c.id)}
                      triggerClassName="rounded-lg border border-border px-2 py-1 text-xs text-muted hover:bg-surface hover:text-foreground cursor-pointer"
                      title="¿Eliminar esta consulta?"
                      description={`Se va a borrar esta consulta puntual del ${fmtDateTime.format(c.consultedAt)}. Las demás consultas de este CUIT quedan intactas.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
