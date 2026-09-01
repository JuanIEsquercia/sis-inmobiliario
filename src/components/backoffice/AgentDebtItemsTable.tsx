"use client";

import { useState } from "react";
import Link from "next/link";
import { PagarDeudaDialog } from "./PagarDeudaDialog";
import { PagarLoteDialog } from "./PagarLoteDialog";
import type { AgentDebtItem } from "@/lib/agentes";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

function itemKey(item: AgentDebtItem): string {
  return `${item.sourceType}:${item.sourceId}:${item.role}`;
}

// Selección en lote: solo se pueden tildar líneas con saldo pendiente, y
// una vez que hay algo seleccionado, las de otra moneda se deshabilitan
// (la única regla del pago en lote es que todo comparta moneda — ver
// registrarPagoLote). El checkbox de cada fila usa la misma `itemKey`
// que arma el value oculto que lee el server action.
export function AgentDebtItemsTable({
  agentId,
  debtItems,
  canRegistrarPago,
}: {
  agentId: string;
  debtItems: AgentDebtItem[];
  canRegistrarPago: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectedItems = debtItems.filter((item) => selected.has(itemKey(item)));
  const selectedCurrency = selectedItems[0]?.currency ?? null;
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.saldo, 0);

  function toggle(item: AgentDebtItem) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = itemKey(item);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  if (debtItems.length === 0) {
    return <p className="text-sm text-muted">Sin operaciones todavía.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {canRegistrarPago && selectedItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft/30 px-4 py-3">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{selectedItems.length}</span> seleccionadas ·{" "}
            <span className="font-semibold text-accent">
              {selectedCurrency} {fmtMoney(selectedTotal)}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface cursor-pointer"
            >
              Deseleccionar
            </button>
            <PagarLoteDialog
              agentId={agentId}
              items={selectedItems}
              currency={selectedCurrency ?? ""}
              total={selectedTotal}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              {canRegistrarPago && <th className="px-4 py-3 w-8"></th>}
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Operación</th>
              <th className="px-4 py-3">Devengado</th>
              <th className="px-4 py-3">Saldo</th>
              {canRegistrarPago && <th className="px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {debtItems.map((item) => {
              const key = itemKey(item);
              const isSelected = selected.has(key);
              const disabled = item.saldo <= 0 || (selectedCurrency !== null && item.currency !== selectedCurrency && !isSelected);
              return (
                <tr key={key} className="border-b border-border last:border-0 hover:bg-surface">
                  {canRegistrarPago && (
                    <td className="px-4 py-3">
                      {item.saldo > 0 && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={disabled}
                          onChange={() => toggle(item)}
                          className="h-4 w-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 text-muted">{fmtDate.format(item.date)}</td>
                  <td className="px-4 py-3 text-muted">{item.sourceLabel}</td>
                  <td className="px-4 py-3 text-muted">{item.roleLabel}</td>
                  <td className="px-4 py-3">
                    <Link href={item.href} className="text-foreground hover:underline">
                      {item.description}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {item.currency} {fmtMoney(item.amount)}
                  </td>
                  <td className="px-4 py-3">
                    {item.saldo > 0 ? (
                      <span className="font-medium text-accent">
                        {item.currency} {fmtMoney(item.saldo)}
                      </span>
                    ) : (
                      <span className="text-muted">Pagado</span>
                    )}
                  </td>
                  {canRegistrarPago && (
                    <td className="px-4 py-3">
                      {item.saldo > 0 && (
                        <PagarDeudaDialog
                          agentId={agentId}
                          sourceType={item.sourceType}
                          sourceId={item.sourceId}
                          role={item.role}
                          sourceLabel={item.sourceLabel}
                          roleLabel={item.roleLabel}
                          description={item.description}
                          currency={item.currency}
                          amount={item.amount}
                          saldo={item.saldo}
                        />
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
