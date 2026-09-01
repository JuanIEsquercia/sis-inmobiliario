import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getClientById } from "@/lib/alquileres";
import { actualizarCliente } from "../actions";

const statusLabels: Record<string, string> = {
  ACTIVO: "Activo",
  FINALIZADO: "Finalizado",
  RESCINDIDO: "Rescindido",
};

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClienteDetailPage({ params }: PageProps) {
  const profile = await requirePermission("clientes.ver");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const client = await getClientById(numericId);
  if (!client) notFound();

  const canEdit = profile.permissions.includes("clientes.gestionar");

  return (
    <div className="max-w-6xl w-full mx-auto">
      <h1 className="mb-6 text-xl font-semibold text-foreground">
        {client.firstName} {client.lastName}
      </h1>

      <section className="mb-8 rounded-xl border border-border p-5">
        <h2 className="mb-3 text-sm font-medium text-foreground">Datos de contacto</h2>
        <form action={actualizarCliente.bind(null, client.id)} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <input name="firstName" defaultValue={client.firstName} placeholder="Nombre*" required disabled={!canEdit} className="field" />
          <input name="lastName" defaultValue={client.lastName} placeholder="Apellido*" required disabled={!canEdit} className="field" />
          <input name="docId" defaultValue={client.docId ?? ""} placeholder="DNI" disabled={!canEdit} className="field" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="birthDate" className="text-xs text-muted">
              Fecha de nacimiento
            </label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              defaultValue={toDateInputValue(client.birthDate)}
              disabled={!canEdit}
              className="field"
            />
          </div>
          <input name="phone" defaultValue={client.phone ?? ""} placeholder="Teléfono" disabled={!canEdit} className="field" />
          <input name="email" type="email" defaultValue={client.email ?? ""} placeholder="Email" disabled={!canEdit} className="field" />
          {canEdit && (
            <button
              type="submit"
              className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong sm:col-span-3"
            >
              Guardar
            </button>
          )}
        </form>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Como inquilino</h2>
        {client.contractsAsTenant.length === 0 ? (
          <p className="text-sm text-muted">No tiene contratos como inquilino.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {client.contractsAsTenant.map((c) => (
              <li key={c.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Link href={`/backoffice/administraciones/${c.id}`} className="font-medium text-foreground hover:underline">
                    {c.unit.address}
                  </Link>
                  <span className="text-xs text-muted">{statusLabels[c.status]}</span>
                </div>
                <p className="text-muted">
                  {fmtDate.format(c.startDate)} — {fmtDate.format(c.endDate)} · Propietario: {c.owner.firstName}{" "}
                  {c.owner.lastName}
                </p>
                <p className="text-muted">
                  Puntualidad: {c.punctuality.paidOnTime}/{c.punctuality.totalPayments} a tiempo
                  {c.punctuality.paidLate > 0 && `, ${c.punctuality.paidLate} pagadas tarde`}
                  {c.punctuality.overdue > 0 && `, ${c.punctuality.overdue} atrasadas`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Como propietario</h2>
        {client.contractsAsOwner.length === 0 ? (
          <p className="text-sm text-muted">No tiene contratos como propietario.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {client.contractsAsOwner.map((c) => (
              <li key={c.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Link href={`/backoffice/administraciones/${c.id}`} className="font-medium text-foreground hover:underline">
                    {c.unit.address}
                  </Link>
                  <span className="text-xs text-muted">{statusLabels[c.status]}</span>
                </div>
                <p className="text-muted">
                  {fmtDate.format(c.startDate)} — {fmtDate.format(c.endDate)} · Inquilino: {c.tenant.firstName}{" "}
                  {c.tenant.lastName}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Como garante</h2>
        {client.guarantorFor.length === 0 ? (
          <p className="text-sm text-muted">No es garante en ningún contrato.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {client.guarantorFor.map((g) => (
              <li key={g.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/backoffice/administraciones/${g.contract.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {g.contract.unit.address}
                  </Link>
                  <span className="text-xs text-muted">{statusLabels[g.contract.status]}</span>
                </div>
                <p className="text-muted">
                  Inquilino: {g.contract.tenant.firstName} {g.contract.tenant.lastName} · Propietario:{" "}
                  {g.contract.owner.firstName} {g.contract.owner.lastName}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
