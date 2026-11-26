import { requirePermission } from "@/lib/auth";
import { getLlavesDelDia } from "@/lib/visitas";
import { VisitasTabla } from "@/components/backoffice/VisitasTabla";

// Panel de quien entrega y recibe las llaves en la inmobiliaria.
export default async function LlavesDelDiaPage() {
  await requirePermission("visitas.gestionar_llaves");
  const { aEntregar, afuera, porConfirmar, hoy } = await getLlavesDelDia();
  const hoyMs = hoy.getTime();
  const atrasadas = afuera.filter((v) => v.date.getTime() < hoyMs);
  const afueraHoy = afuera.filter((v) => v.date.getTime() >= hoyMs);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-xl font-semibold text-foreground">Llaves del día</h1>
        <p className="text-sm text-muted">Llaves de la inmobiliaria: las que hay que entregar, las que están afuera y las que volvieron.</p>
      </div>

      {atrasadas.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-semibold text-destructive">No volvieron el día de la visita ({atrasadas.length})</h2>
          <VisitasTabla visitas={atrasadas} />
        </section>
      )}

      <section>
        <h2 className="mb-2 text-base font-semibold text-foreground">Para entregar ({aEntregar.length})</h2>
        <p className="mb-2 text-xs text-muted">Pedidas para hoy (o antes) y todavía no retiradas. Al entregarla, abrí la tarjeta y marcá &quot;Entregar llave&quot;.</p>
        <VisitasTabla visitas={aEntregar} vacio="No hay llaves para entregar." />
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold text-foreground">Afuera hoy ({afueraHoy.length})</h2>
        <VisitasTabla visitas={afueraHoy} vacio="No hay llaves afuera." />
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold text-foreground">Devueltas, falta confirmar ({porConfirmar.length})</h2>
        <p className="mb-2 text-xs text-muted">El vendedor marcó que la devolvió: confirmá que está en el tablero.</p>
        <VisitasTabla visitas={porConfirmar} vacio="Nada para confirmar." />
      </section>
    </div>
  );
}
