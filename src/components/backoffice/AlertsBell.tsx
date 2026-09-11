"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AlertsSummary, CurrencyAmount } from "@/lib/dashboard";

const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 0 });

function formatAmounts(amounts: CurrencyAmount[]): string | undefined {
  if (amounts.length === 0) return undefined;
  return amounts.map((a) => `${a.currency} ${fmtMoney(a.amount)}`).join(" · ");
}

interface AlertsBellProps {
  alerts: AlertsSummary | null;
  canAdmin: boolean;
  canCaja: boolean;
}

// Centro de notificaciones del header — visible en cualquier página del
// backoffice (a diferencia del panel "Alertas" del dashboard, que solo
// se ve al entrar a /backoffice). Mismos 3 llamados de atención, mismos
// datos (AlertsSummary ya viene filtrado por permiso desde el layout),
// solo que acá se resumen a lo justo para no ocupar espacio: cantidad +
// link directo a donde se resuelve cada uno.
export function AlertsBell({ alerts, canAdmin, canCaja }: AlertsBellProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (!alerts || (!canAdmin && !canCaja)) return null;

  const items = [
    canAdmin && {
      label: "Actualizaciones atrasadas",
      count: alerts.actualizaciones.count,
      subtitle: "Indexación vencida sin aplicar",
      href: "/backoffice/administraciones/actualizaciones",
    },
    canAdmin && {
      label: "Contratos por vencer",
      count: alerts.vencimientos.count,
      subtitle: "Vencen dentro de 60 días",
      href: "/backoffice/administraciones/actualizaciones",
    },
    (canAdmin || canCaja) && {
      label: "Cobros atrasados",
      count: alerts.cobros.count,
      subtitle: formatAmounts(alerts.cobros.amounts) ?? "Sin cobros atrasados",
      href: "/backoffice#pendientes-cobro",
    },
  ].filter((item): item is { label: string; count: number; subtitle: string; href: string } => !!item);

  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={total > 0 ? `${total} alertas pendientes` : "Sin alertas pendientes"}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:text-foreground hover:bg-surface/80 border border-border/40 cursor-pointer transition-colors"
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {total > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-border/60 bg-surface shadow-premium overflow-hidden">
          <div className="border-b border-border/50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground">Alertas</p>
          </div>
          {total === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted">No hay nada atrasado ni por vencer. 🎉</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border/40">
              {items
                .filter((item) => item.count > 0)
                .map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-background/60 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">{item.label}</p>
                        <p className="mt-0.5 text-[11px] text-muted">{item.subtitle}</p>
                      </div>
                      <span className="flex-none rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        {item.count}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
