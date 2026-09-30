import Link from "next/link";

// Cartel para cuando se entra a una propiedad que ya no está publicada.
//
// Existe como not-found propio del segmento (y no se usa el genérico del
// sitio) porque acá el caso es distinto: no es "esta página no existe",
// es "esta propiedad se dio de baja", que es algo que va a pasar seguido
// — el catálogo se sincroniza con Adinco todos los días y lo que sale
// del feed se despublica. El visitante suele llegar desde un link que le
// pasó un agente por WhatsApp, así que lo importante es explicarle qué
// pasó y darle a dónde seguir, no dejarlo en un 404 seco.
//
// Cubre también el caso de un código que nunca existió (un error de
// tipeo): desde la URL no hay forma de distinguirlos, y el mensaje sirve
// igual para los dos.
//
// Este archivo es SOLO la pantalla. El título y el noindex se declaran
// en el generateMetadata de page.tsx: Next toma el export `metadata`
// únicamente de layout.tsx y page.tsx, así que acá no tendría efecto
// (se probó, y la página salía con el "index, follow" heredado del
// layout raíz).

export default function PropiedadNoDisponible() {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="rounded-full border border-border px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted">
        No disponible
      </span>

      <h1 className="text-xl font-semibold text-foreground">Esta propiedad ya no está disponible</h1>

      <p className="text-sm text-muted">
        Puede que se haya vendido o alquilado, o que la hayamos dado de baja. Mirá las propiedades que tenemos
        publicadas hoy, o escribinos y te ayudamos a encontrar algo parecido.
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/propiedades"
          className="rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-accent-foreground shadow-sm transition-colors hover:bg-accent-strong"
        >
          Ver propiedades disponibles
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-border px-5 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
