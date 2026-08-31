"use client";

// Botón manual por si se cerró el diálogo de <AutoPrint /> sin guardar.
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden mb-6 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface"
    >
      Imprimir / Guardar como PDF
    </button>
  );
}
