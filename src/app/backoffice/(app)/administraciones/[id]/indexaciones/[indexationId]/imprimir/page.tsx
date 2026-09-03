import { notFound } from "next/navigation";
import Image from "next/image";
import { getIndexationById, clientLabel } from "@/lib/alquileres";
import { requirePermission } from "@/lib/auth";
import { AutoPrint } from "@/components/backoffice/AutoPrint";
import { PrintButton } from "@/components/backoffice/PrintButton";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

interface PageProps {
  params: Promise<{ id: string; indexationId: string }>;
}

// Comprobante de una actualización puntual — "Alquiler actual X,
// actualización periódica por índice Y%, valor actualizado Z". Mismo
// mecanismo de impresión que las liquidaciones (AutoPrint + logo +
// color de marca, sin librería de PDF).
export default async function ImprimirIndexacionPage({ params }: PageProps) {
  await requirePermission("administraciones.ver");
  const { id, indexationId } = await params;
  const numericIndexationId = Number(indexationId);
  if (!Number.isFinite(numericIndexationId)) notFound();

  const indexation = await getIndexationById(numericIndexationId);
  if (!indexation || String(indexation.contractId) !== id) notFound();

  const percentage = indexation.percentage !== null ? Number(indexation.percentage) : null;

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
              Comprobante de Actualización de Alquiler
            </p>
          </div>
        </div>
        <div className="text-left sm:text-right border-l-2 border-[#c52125] pl-4 sm:border-l-0 sm:pl-0">
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Fecha de aplicación</p>
          <p className="text-lg font-light tracking-tight text-neutral-800">{fmtDate.format(indexation.appliedAt)}</p>
        </div>
      </div>

      {/* Datos */}
      <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-12 text-sm bg-neutral-50 rounded-2xl p-6 border border-neutral-100">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">Inquilino</span>
          <span className="text-neutral-800 font-semibold text-base">{clientLabel(indexation.contract.tenant)}</span>
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">Propietario</span>
          <span className="text-neutral-800 font-semibold text-base">{clientLabel(indexation.contract.owner)}</span>
        </div>
        <div className="sm:col-span-2 border-t border-neutral-200/60 pt-4 mt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-1">Propiedad</span>
          <span className="text-neutral-800 font-medium">
            <span className="font-bold text-[#c52125]">{indexation.contract.unit.propertyCode}</span> —{" "}
            {indexation.contract.unit.address}
          </span>
        </div>
      </div>

      {/* Detalle de la actualización */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-neutral-200">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-neutral-200 bg-white">
            <tr>
              <td className="px-6 py-4 text-neutral-500 font-medium">Alquiler actual</td>
              <td className="px-6 py-4 text-right text-neutral-900 font-semibold">
                {indexation.contract.currency} {fmtMoney(Number(indexation.previousAmount))}
              </td>
            </tr>
            <tr className="bg-neutral-50/50">
              <td className="px-6 py-4 text-neutral-500 font-medium">
                Actualización periódica{indexation.indexType ? ` por índice ${indexation.indexType.code}` : ""}
              </td>
              <td className="px-6 py-4 text-right text-neutral-900 font-semibold">
                {percentage !== null ? `${percentage > 0 ? "+" : ""}${indexation.percentage!.toString()}%` : "—"}
              </td>
            </tr>
            <tr>
              <td className="px-6 py-4 text-neutral-800 font-bold">Valor actualizado</td>
              <td className="px-6 py-4 text-right text-xl font-bold text-[#c52125]">
                {indexation.contract.currency} {fmtMoney(Number(indexation.newAmount))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {indexation.notes && (
        <div className="mb-8 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6 text-sm">
          <h3 className="font-bold text-[#c52125] uppercase tracking-wider text-xs mb-2">Notas</h3>
          <p className="text-neutral-700 whitespace-pre-line">{indexation.notes}</p>
        </div>
      )}

      <p className="text-center text-[10px] text-neutral-400 uppercase tracking-widest">
        Comprobante interno de actualización — no reemplaza la liquidación mensual
      </p>
    </div>
  );
}
