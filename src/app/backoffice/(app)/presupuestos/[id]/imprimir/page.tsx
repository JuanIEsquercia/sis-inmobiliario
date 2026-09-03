import { notFound } from "next/navigation";
import Image from "next/image";
import { requirePermission } from "@/lib/auth";
import { getBudgetById, budgetItemsTotal, itemsByRecipient } from "@/lib/presupuestos";
import { AutoPrint } from "@/components/backoffice/AutoPrint";
import { PrintButton } from "@/components/backoffice/PrintButton";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ para?: string }>;
}

export default async function ImprimirPresupuestoPage({ params, searchParams }: PageProps) {
  await requirePermission("presupuestos.ver");
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const budget = await getBudgetById(numericId);
  if (!budget) notFound();

  const { para } = await searchParams;
  const isVenta = budget.type === "VENTA";
  // En Alquiler solo existe la copia del inquilino; en Venta, comprador
  // es la copia por default salvo que se pida explícitamente propietario.
  const recipient = isVenta ? (para === "propietario" ? "PROPIETARIO" : "COMPRADOR") : "INQUILINO";
  const recipientLabel = recipient === "PROPIETARIO" ? "Propietario" : recipient === "COMPRADOR" ? "Comprador" : "Inquilino";
  const recipientName = recipient === "PROPIETARIO" ? budget.ownerName : recipient === "COMPRADOR" ? budget.buyerName : budget.tenantName;

  const items = itemsByRecipient(budget.items, recipient);
  const total = budgetItemsTotal(items);

  return (
    <div
      className="mx-auto max-w-3xl bg-white p-8 sm:p-12 text-neutral-900 shadow-sm print:shadow-none print:p-0 print:max-w-full"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page {
          size: A4 portrait;
          margin: 20mm;
        }
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
        }
      `,
        }}
      />

      <AutoPrint />
      <div className="print:hidden mb-6 flex justify-end">
        <PrintButton />
      </div>

      {/* Cabecera Corporativa */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-neutral-200 pb-8">
        <div className="flex items-center gap-4">
          <Image src="/logo-light.png" alt="Garcia Propiedades" width={455} height={337} priority className="h-16 w-auto" />
          <div className="h-12 w-px bg-neutral-200 hidden sm:block" />
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider text-[#c52125]">Garcia Propiedades</h1>
            <p className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mt-0.5">
              Presupuesto de {isVenta ? "Venta" : "Alquiler"} — {recipientLabel}
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right border-l-2 border-[#c52125] pl-4 sm:border-l-0 sm:pl-0">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Fecha</p>
          <p className="text-lg font-light tracking-tight text-neutral-800">{fmtDate.format(budget.createdAt)}</p>
        </div>
      </div>

      {/* Datos */}
      <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-12 text-sm bg-neutral-50 rounded-2xl p-6 border border-neutral-100">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">{recipientLabel}</span>
          <span className="text-neutral-800 font-semibold text-base">{recipientName ?? "A completar"}</span>
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">Propiedad</span>
          <span className="text-neutral-800 font-medium">{budget.unitDetail}</span>
        </div>
      </div>

      {/* Conceptos */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-100/80 border-b border-neutral-200 text-left text-xs font-bold uppercase tracking-wider text-neutral-600">
              <th className="px-6 py-3.5">Concepto</th>
              <th className="px-6 py-3.5 text-right w-36">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {items.length === 0 ? (
              <tr>
                <td className="px-6 py-4 text-neutral-400" colSpan={2}>
                  Sin conceptos cargados.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4 text-neutral-800 font-medium">{item.description}</td>
                  <td className="px-6 py-4 text-right text-neutral-900 font-semibold">
                    {budget.currency} {fmtMoney(Number(item.amount))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="mb-10 flex flex-col items-end">
        <div className="w-full sm:w-80 bg-neutral-50 rounded-2xl p-6 border border-neutral-200">
          <div className="flex justify-between items-center text-sm">
            <span className="font-bold text-neutral-800 text-base">Total</span>
            <span className="text-2xl font-bold text-[#c52125]">
              {budget.currency} {fmtMoney(total)}
            </span>
          </div>
        </div>
      </div>

      {budget.observations && (
        <div className="mb-8 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 text-sm">
          <h3 className="font-bold text-[#c52125] uppercase tracking-wider text-xs mb-2">Observaciones</h3>
          <p className="text-neutral-700 whitespace-pre-line">{budget.observations}</p>
        </div>
      )}

      <p className="text-center text-[10px] text-neutral-400 uppercase tracking-widest">
        Presupuesto sin validez de factura — valores sujetos a confirmación
      </p>
    </div>
  );
}
