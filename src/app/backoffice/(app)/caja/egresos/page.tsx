import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getExpenseCategories, getExpenses } from "@/lib/caja";
import { CajaTabs } from "@/components/backoffice/CajaTabs";
import { DatePicker } from "@/components/backoffice/DatePicker";
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
    <div>
      <CajaTabs active="egresos" />
      <h1 className="mb-1 text-xl font-semibold text-foreground">Egresos</h1>
      <p className="mb-6 text-sm text-muted">
        Gastos reales de la agencia — el contrapeso de los ingresos, para que Caja pueda mostrar un neto real. Los
        pagos a agentes no se cargan acá: ya se contabilizan aparte en el Consolidado.
      </p>

      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          <Link
            href="/backoffice/caja/egresos"
            className={`rounded-full border px-3 py-1.5 ${
              !categoryId ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-foreground"
            }`}
          >
            Todas
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/backoffice/caja/egresos?categoria=${c.id}`}
              className={`rounded-full border px-3 py-1.5 ${
                categoryId === c.id ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {totalsByCurrency.size > 0 && (
        <div className="mb-6 flex flex-wrap gap-4">
          {[...totalsByCurrency.entries()].map(([currency, total]) => (
            <div key={currency} className="rounded-xl border border-border px-4 py-3 text-sm">
              <span className="text-muted">Total {currency}</span>{" "}
              <span className="font-semibold text-foreground">{fmtMoney(total)}</span>
            </div>
          ))}
        </div>
      )}

      {canCreate && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-dashed border-border p-4">
            <h2 className="mb-3 text-sm font-medium text-foreground">Nueva categoría</h2>
            <form action={crearCategoriaGasto} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="categoryName" className="text-xs text-muted">
                  Nombre*
                </label>
                <input id="categoryName" name="name" required className="field" placeholder="Alquiler oficina" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="categoryType" className="text-xs text-muted">
                  Tipo*
                </label>
                <select id="categoryType" name="type" required defaultValue="FIJO" className="field">
                  <option value="FIJO">Fijo (se repite mes a mes)</option>
                  <option value="VARIABLE">Variable (puntual, sin patrón)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-fit rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
              >
                Crear categoría
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-dashed border-border p-4">
            <h2 className="mb-3 text-sm font-medium text-foreground">Registrar gasto</h2>
            {categories.length === 0 ? (
              <p className="text-sm text-muted">Creá primero una categoría.</p>
            ) : (
              <form action={registrarGasto} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="expenseCategory" className="text-xs text-muted">
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
                    <label htmlFor="expenseAmount" className="text-xs text-muted">
                      Monto*
                    </label>
                    <input id="expenseAmount" name="amount" type="number" step="0.01" required className="field" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="expenseCurrency" className="text-xs text-muted">
                      Moneda
                    </label>
                    <select id="expenseCurrency" name="currency" defaultValue="ARS" className="field">
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <label htmlFor="expenseDate" className="text-xs text-muted">
                      Fecha
                    </label>
                    <DatePicker id="expenseDate" name="occurredAt" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <label htmlFor="expenseMethod" className="text-xs text-muted">
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
                  <label htmlFor="expenseNotes" className="text-xs text-muted">
                    Notas
                  </label>
                  <input id="expenseNotes" name="notes" className="field" placeholder="Opcional" />
                </div>
                <button
                  type="submit"
                  className="w-fit rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-strong"
                >
                  Registrar gasto
                </button>
              </form>
            )}
          </section>
        </div>
      )}

      {expenses.length === 0 ? (
        <p className="text-sm text-muted">
          {categoryId ? "No hay gastos cargados en esta categoría." : "Todavía no hay gastos cargados."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Medio</th>
                <th className="px-4 py-3">Notas</th>
                <th className="px-4 py-3">Monto</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-muted">{fmtDate.format(e.occurredAt)}</td>
                  <td className="px-4 py-3 text-foreground">
                    {e.category.name} <span className="text-muted">({typeLabels[e.category.type]})</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{e.method ? methodLabels[e.method] : "—"}</td>
                  <td className="px-4 py-3 text-muted">{e.notes ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground">
                    {e.currency} {fmtMoney(Number(e.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
