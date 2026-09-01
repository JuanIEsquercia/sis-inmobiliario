import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getUnitById, clientLabel } from "@/lib/alquileres";

const statusLabels: Record<string, string> = {
  ACTIVO: "Activo",
  FINALIZADO: "Finalizado",
  RESCINDIDO: "Rescindido",
  ANULADO: "Anulado",
};

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HistorialUnidadPage({ params }: PageProps) {
  await requirePermission("historial.ver");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const unit = await getUnitById(numericId);
  if (!unit) notFound();

  return (
    <div className="max-w-6xl w-full mx-auto">
      <Link href="/backoffice/historial" className="mb-2 inline-block text-xs text-accent hover:underline">
        ← Historial de propiedades
      </Link>
      <h1 className="text-xl font-semibold text-foreground">{unit.address}</h1>
      <p className="mb-6 text-sm text-muted">
        Código {unit.propertyCode}
        {unit.city ? ` · ${unit.city}` : ""}
        {unit.propertyType ? ` · ${unit.propertyType}` : ""}
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Contratos de alquiler</h2>
        {unit.contracts.length === 0 ? (
          <p className="text-sm text-muted">Todavía no tuvo contratos de alquiler.</p>
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
                  Inquilino: {clientLabel(c.tenant)} · Propietario: {clientLabel(c.owner)}
                </p>
                <p className="text-muted">
                  Alquiler: {c.currency} {fmtMoney(Number(c.rentAmount))}
                  {c.lastIndexedAt && ` (última actualización ${fmtDate.format(c.lastIndexedAt)})`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Ventas</h2>
        {unit.sales.length === 0 ? (
          <p className="text-sm text-muted">Todavía no se vendió a través de la inmobiliaria.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {unit.sales.map((s) => (
              <li key={s.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Link href={`/backoffice/caja/ventas/${s.id}`} className="font-medium text-foreground hover:underline">
                    {fmtDate.format(s.closedAt)}
                  </Link>
                  {s.saleAmount && (
                    <span className="text-muted">
                      {s.currency} {fmtMoney(Number(s.saleAmount))}
                    </span>
                  )}
                </div>
                {(s.seller || s.buyer) && (
                  <p className="text-muted">
                    {s.seller && `Vendedor: ${s.seller.firstName} ${s.seller.lastName}`}
                    {s.seller && s.buyer && " · "}
                    {s.buyer && `Comprador: ${s.buyer.firstName} ${s.buyer.lastName}`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Tasaciones</h2>
        {unit.appraisals.length === 0 ? (
          <p className="text-sm text-muted">Todavía no se tasó a través de la inmobiliaria.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {unit.appraisals.map((a) => (
              <li key={a.id} className="rounded-lg border border-border p-3 text-sm flex items-center justify-between">
                <span className="text-foreground">{fmtDate.format(a.completedAt)}</span>
                <span className="text-muted">
                  {a.currency} {fmtMoney(Number(a.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
