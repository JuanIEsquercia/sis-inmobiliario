import Link from "next/link";
import { notFound } from "next/navigation";
import { getContractById, getIndexTypes, paymentTotal } from "@/lib/alquileres";
import { getSignedDocumentUrl } from "@/lib/supabase/storage";
import { requirePermission } from "@/lib/auth";
import { subirDocumento, aplicarIndexacion } from "../actions";

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

const documentTypeLabels: Record<string, string> = {
  CONTRATO: "Contrato",
  DNI_INQUILINO: "DNI inquilino",
  DNI_GARANTE: "DNI garante",
  OTRO: "Otro",
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

  const indexTypes = await getIndexTypes();

  const documentsWithUrls = await Promise.all(
    contract.documents.map(async (doc) => ({ ...doc, url: await getSignedDocumentUrl(doc.storagePath) }))
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{contract.unit.address}</h1>
          <p className="text-sm text-muted">
            {contract.tenant.firstName} {contract.tenant.lastName} (inquilino) · {contract.owner.firstName}{" "}
            {contract.owner.lastName} (propietario)
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
            {fmtDate.format(contract.startDate)} — {fmtDate.format(contract.endDate)} ({contract.durationMonths} meses)
          </dd>
        </div>
        <div>
          <dt className="text-muted">Actualización</dt>
          <dd className="text-foreground">
            {contract.indexationFrequencyMonths
              ? `Cada ${contract.indexationFrequencyMonths} meses${contract.indexType ? ` (${contract.indexType.code})` : ""}`
              : "No aplica"}
          </dd>
        </div>
        {contract.nextIndexationDueAt && (
          <div>
            <dt className="text-muted">Próxima actualización</dt>
            <dd className="text-foreground">{fmtDate.format(contract.nextIndexationDueAt)}</dd>
          </div>
        )}
        {contract.concepts.length > 0 && (
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-muted">Conceptos recurrentes</dt>
            <dd className="text-foreground">{contract.concepts.map((c) => c.concept.name).join(", ")}</dd>
          </div>
        )}
        {contract.notes && (
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-muted">Notas</dt>
            <dd className="whitespace-pre-line text-foreground">{contract.notes}</dd>
          </div>
        )}
      </dl>

      {contract.guarantors.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Garantes</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {contract.guarantors.map((g) => (
              <li key={g.id} className="text-foreground">
                {g.firstName} {g.lastName}
                {g.docId ? ` · DNI ${g.docId}` : ""}
                {g.phone ? ` · ${g.phone}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Liquidaciones</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5">Período</th>
                <th className="px-4 py-2.5">Vence</th>
                <th className="px-4 py-2.5">Total</th>
                <th className="px-4 py-2.5">Estado</th>
              </tr>
            </thead>
            <tbody>
              {contract.payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/backoffice/alquileres/${contract.id}/liquidaciones/${p.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {monthNames[p.periodMonth - 1]} {p.periodYear}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{fmtDate.format(p.dueDate)}</td>
                  <td className="px-4 py-2.5 text-foreground">
                    {p.currency} {paymentTotal(p.items).toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{paymentStatusLabels[p.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Documentos</h2>
        {documentsWithUrls.length > 0 && (
          <ul className="mb-4 flex flex-col gap-1.5 text-sm">
            {documentsWithUrls.map((doc) => (
              <li key={doc.id}>
                {doc.url ? (
                  <a href={doc.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    {documentTypeLabels[doc.type]} — {doc.fileName}
                  </a>
                ) : (
                  <span className="text-muted">{documentTypeLabels[doc.type]} — {doc.fileName} (no disponible)</span>
                )}
                <span className="text-muted"> · subido por @{doc.uploadedBy.username}</span>
              </li>
            ))}
          </ul>
        )}
        <form action={subirDocumento.bind(null, contract.id)} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="docType" className="text-xs text-muted">
              Tipo
            </label>
            <select id="docType" name="type" defaultValue="CONTRATO" className="field">
              <option value="CONTRATO">Contrato</option>
              <option value="DNI_INQUILINO">DNI inquilino</option>
              <option value="DNI_GARANTE">DNI garante</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="file" className="text-xs text-muted">
              Archivo (PDF, máx. 10MB)
            </label>
            <input id="file" name="file" type="file" accept="application/pdf" required className="field" />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
          >
            Subir
          </button>
        </form>
      </section>

      {profile.permissions.includes("alquileres.indexacion") && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Indexación</h2>

          {contract.indexations.length > 0 && (
            <ul className="mb-4 flex flex-col gap-1.5 text-sm">
              {contract.indexations.map((i) => (
                <li key={i.id} className="text-muted">
                  {fmtDate.format(i.appliedAt)}: {contract.currency} {i.previousAmount.toString()} →{" "}
                  <span className="text-foreground">{contract.currency} {i.newAmount.toString()}</span>
                  {i.indexType ? ` (${i.indexType.code})` : ""}
                </li>
              ))}
            </ul>
          )}

          <form action={aplicarIndexacion.bind(null, contract.id)} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="newAmount" className="text-xs text-muted">
                Nuevo monto
              </label>
              <input id="newAmount" name="newAmount" type="number" step="0.01" required className="field w-32" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="idxTypeSelect" className="text-xs text-muted">
                Índice
              </label>
              <select id="idxTypeSelect" name="indexTypeId" defaultValue={contract.indexTypeId ?? ""} className="field">
                <option value="">Sin índice</option>
                {indexTypes.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.code}
                  </option>
                ))}
              </select>
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
        </section>
      )}
    </div>
  );
}
