import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { getSaleById } from "@/lib/caja";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VentaDetailPage({ params }: PageProps) {
  await requirePermission("caja.ver");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const sale = await getSaleById(numericId);
  if (!sale) notFound();

  return (
    <div className="max-w-xl">
      <Link href="/backoffice/caja/ventas" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← Ventas
      </Link>

      <h1 className="mb-1 text-xl font-semibold text-foreground">
        {sale.unit.propertyCode} — {sale.unit.address}
      </h1>
      <p className="mb-6 text-sm text-muted">
        <Link href={`/backoffice/administraciones/unidades/${sale.unitId}`} className="hover:underline">
          Ver historial de la propiedad
        </Link>
      </p>

      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl border border-border p-5 text-sm">
        {sale.saleAmount && (
          <div>
            <dt className="text-muted">Precio de venta</dt>
            <dd className="text-foreground">
              {sale.currency} {fmtMoney(Number(sale.saleAmount))}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-muted">Comisión</dt>
          <dd className="font-medium text-foreground">
            {sale.currency} {fmtMoney(Number(sale.commissionAmount))}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Fecha de cierre</dt>
          <dd className="text-foreground">{fmtDate.format(sale.closedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted">Vendedor</dt>
          <dd className="text-foreground">
            {sale.agent.firstName} {sale.agent.lastName}
          </dd>
        </div>
        {sale.notes && (
          <div className="col-span-2">
            <dt className="text-muted">Notas</dt>
            <dd className="whitespace-pre-line text-foreground">{sale.notes}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
