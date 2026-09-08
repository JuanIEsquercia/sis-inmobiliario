import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getExpenseCategories, getExpenses } from "@/lib/caja";
import { CajaTabs } from "@/components/backoffice/CajaTabs";
import { DatePicker } from "@/components/backoffice/DatePicker";
import { ResponsiveDataGrid } from "@/components/backoffice/ResponsiveDataGrid";
import { crearCategoriaGasto, registrarGasto } from "../actions";

const fmtDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const fmtMoney = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

const typeLabels: Record<string, string> = { FIJO: "Fijo", VARIABLE: "Variable" };
const methodLabels: Record<string, string> = { EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia" };

interface PageProps {
  searchParams: Promise<{ categoria?: string }>;
}

export default async function EgresosPage({ searchParams }: PageProps) {
  const profile = await requirePermission("caja.ver");
  const canCreate = profile.permissions.includes("caja.gastos.crear");
  const { categoria } = await searchParams;
  const categoryId = categoria ? Number(categoria) : undefined;

  const [categories, expenses] = await Promise.all([
    getExpenseCategories(),
    getExpenses(categoryId ? { categoryId } : undefined),
  ]);

  const totalsByCurrency = new Map<string, number>();
  for (const e of expenses) {
    totalsByCurrency.set(e.currency, (totalsByCurrency.get(e.currency) ?? 0) + Number(e.amount));
  }

  return (
    <div className="space-y-6">
      <CajaTabs active="egresos" />

      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">Egresos y Gastos</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted leading-relaxed max-w-3xl">
          Gastos de la agencia para calcular el resultado neto real.
        </p>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs font-semibold overflow-x-auto pb-1 no-scrollbar">
          <Link
            href="/backoffice/caja/egresos"
            className={`shrink-0 rounded-xl border px-3.5 py-2 transition-all ${
              !categoryId
                ? "border-accent bg-accent text-accent-foreground shadow-xs"
                : "border-border/60 bg-surface text-muted hover:text-foreground"
            }`}
          >
            Todas las categorías
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/backoffice/caja/egresos?categoria=${c.id}`}
              className={`shrink-0 rounded-xl border px-3.5 py-2 transition-all ${
                categoryId === c.id
                  ? "border-accent bg-accent text-accent-foreground shadow-xs"
                  : "border-border/60 bg-surface text-muted hover:text-foreground"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {totalsByCurrency.size > 0 && (
        <div className="flex flex-wrap gap-4">
          {[...totalsByCurrency.entries()].map(([currency, total]) => (
            <div key={currency} className="rounded-2xl border border-border/60 bg-surface px-5 py-3.5 text-sm shadow-xs">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block">Total Egresos ({currency})</span>
              <span className="font-extrabold text-foreground text-lg">{currency} {fmtMoney(total)}</span>
            </div>
          ))}
        </div>
      )}

      {canCreate && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-dashed border-border/70 bg-surface/40 p-4 sm:p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Nueva Categoría</h2>
            <form action={crearCategoriaGasto} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="categoryName" className="text-xs text-muted font-medium">
                  Nombre*
                </label>
                <input id="categoryName" name="name" required className="field" placeholder="Alquiler oficina" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="categoryType" className="text-xs text-muted font-medium">
                  Tipo*
                </label>
                <select id="categoryType" name="type" required defaultValue="FIJO" className="field">
                  <option value="FIJO">Fijo (se repite mes a mes)</option>
                  <option value="VARIABLE">Variable (puntual, sin patrón)</option>
                </select>
              </div>
              <button
                type="submit"
                className="h-10 w-full sm:w-fit rounded-xl border border-border bg-surface px-4 text-xs font-semibold text-foreground hover:bg-background transition-colors cursor-pointer"
              >
                Crear categoría
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-dashed border-border/70 bg-surface/40 p-4 sm:p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Registrar Gasto</h2>
            {categories.length === 0 ? (
              <p className="text-xs text-muted">Creá primero una categoría.</p>
            ) : (
              <form action={registrarGasto} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="expenseCategory" className="text-xs text-muted font-medium">
                    Categoría*
                  </label>
                  <select id="expenseCategory" name="categoryId" required className="field">
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({typeLabels[c.type]})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <label htmlFor="expenseAmount" className="text-xs text-muted font-medium">
                      Monto*
                    </label>
                    <input id="expenseAmount" name="amount" type="number" step="0.01" required className="field" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="expenseCurrency" className="text-xs text-muted font-medium">
                      Moneda
                    </label>
                    <select id="expenseCurrency" name="currency" defaultValue="ARS" className="field w-24">
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <label htmlFor="expenseDate" className="text-xs text-muted font-medium">
                      Fecha
                    </label>
                    <DatePicker id="expenseDate" name="occurredAt" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <label htmlFor="expenseMethod" className="text-xs text-muted font-medium">
                      Medio
                    </label>
                    <select id="expenseMethod" name="method" defaultValue="" className="field">
                      <option value="">—</option>
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="expenseNotes" className="text-xs text-muted font-medium">
                    Notas
                  </label>
                  <input id="expenseNotes" name="notes" className="field" placeholder="Opcional" />
                </div>
                <button
                  type="submit"
                  className="h-10 w-full sm:w-fit rounded-xl bg-accent px-5 text-xs font-bold uppercase tracking-wider text-accent-foreground hover:bg-accent-strong transition-colors cursor-pointer shadow-xs"
                >
                  Registrar gasto
                </button>
              </form>
            )}
          </section>
        </div>
      )}

      <ResponsiveDataGrid
        isEmpty={expenses.length === 0}
        emptyMessage={categoryId ? "No hay gastos cargados en esta categoría." : "Todavía no hay gastos cargados."}
        mobileCards={
          <>
            {expenses.map((e) => (
              <div key={e.id} className="rounded-2xl border border-border/60 bg-surface p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-2.5">
                  <div>
                    <p className="font-bold text-foreground text-sm">{e.category.name}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted bg-background border border-border px-2 py-0.5 rounded-lg mt-0.5 inline-block">
                      {typeLabels[e.category.type]}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-foreground text-base block">
                      {e.currency} {fmtMoney(Number(e.amount))}
                    </span>
                    <span className="text-xs text-muted font-medium">{fmtDate.format(e.occurredAt)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Medio</span>
                    <span className="font-semibold text-foreground">{e.method ? methodLabels[e.method] : "—"}</span>
                  </div>
                  <div className="bg-background/50 p-2.5 rounded-xl border border-border/40">
                    <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Notas</span>
                    <span className="font-medium text-foreground truncate block">{e.notes ?? "—"}</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        }
        table={
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Medio</th>
                <th className="px-4 py-3">Notas</th>
                <th className="px-4 py-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted font-medium">{fmtDate.format(e.occurredAt)}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {e.category.name} <span className="text-xs text-muted font-normal">({typeLabels[e.category.type]})</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{e.method ? methodLabels[e.method] : "—"}</td>
                  <td className="px-4 py-3 text-muted">{e.notes ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">
                    {e.currency} {fmtMoney(Number(e.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      />
    </div>
  );
}
