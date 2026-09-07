import React from "react";

interface ResponsiveDataGridProps {
  table: React.ReactNode;
  mobileCards: React.ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function ResponsiveDataGrid({
  table,
  mobileCards,
  emptyMessage = "No hay datos para mostrar.",
  isEmpty = false,
}: ResponsiveDataGridProps) {
  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-border/60 bg-surface p-12 text-center shadow-xs">
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Vista Móvil: Tarjetas Adaptativas (< 768px) */}
      <div className="grid grid-cols-1 gap-3.5 md:hidden">{mobileCards}</div>

      {/* Vista Desktop / Tablet Horizontal: Tabla de Datos (≥ 768px) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-border/50 bg-surface shadow-sm">
        {table}
      </div>
    </>
  );
}
