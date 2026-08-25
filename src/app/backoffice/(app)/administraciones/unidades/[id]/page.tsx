import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getUnitById } from "@/lib/alquileres";

const statusLabels: Record<string, string> = {
  ACTIVO: "Activo",
  FINALIZADO: "Finalizado",
  RESCINDIDO: "Rescindido",
};

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UnidadDetailPage({ params }: PageProps) {
  await requirePermission("administraciones.ver");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const unit = await getUnitById(numericId);
  if (!unit) notFound();

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold text-foreground">{unit.address}</h1>
      <p className="mb-6 text-sm text-muted">
        Código {unit.propertyCode}
        {unit.city ? ` · ${unit.city}` : ""}
        {unit.propertyType ? ` · ${unit.propertyType}` : ""}
      </p>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Historial de contratos</h2>
        {unit.contracts.length === 0 ? (
          <p className="text-sm text-muted">Todavía no tiene contratos de administración.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {unit.contracts.map((c) => (
              <li key={c.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Link href={`/backoffice/administraciones/${c.id}`} className="font-medium text-foreground hover:underline">
                    {fmtDate.format(c.startDate)} — {fmtDate.format(c.endDate)}
                  </Link>
                  <span className="text-xs text-muted">{statusLabels[c.status]}</span>
                </div>
                <p className="text-muted">
                  Inquilino: {c.tenant.firstName} {c.tenant.lastName} · Propietario: {c.owner.firstName}{" "}
                  {c.owner.lastName}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
