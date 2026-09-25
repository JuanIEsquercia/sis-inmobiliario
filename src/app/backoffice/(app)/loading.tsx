// Estado de carga de todo lo que vive bajo el shell del backoffice
// (Sidebar + header). Al estar en (app)/, reemplaza solo el <main>: la
// navegación de al lado queda intacta y clickeable, igual que error.tsx.
//
// Por qué importa acá en particular: todas las páginas de este sistema
// son dinámicas (piden datos por usuario en cada carga) y la base está
// en Oregon, así que cada consulta cuesta caro. Sin un loading.tsx,
// Next no puede mostrar nada hasta tener TODOS los datos listos: el
// navegador se queda mostrando la página ANTERIOR, congelada, sin
// ninguna señal de que algo está pasando. Eso es exactamente la
// sensación de "el sistema tarda" incluso cuando tarda lo mismo: no
// hay respuesta al clic. Con esto, el clic pinta el esqueleto al
// instante y el contenido entra cuando llega.
export default function BackofficeLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Cargando">
      {/* Título */}
      <div className="mb-6 h-7 w-64 rounded-lg bg-surface" />

      {/* Fila de tarjetas tipo KPI */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-surface/60 p-5">
            <div className="h-3 w-24 rounded bg-border/70" />
            <div className="mt-3 h-7 w-20 rounded bg-border/50" />
            <div className="mt-2 h-2.5 w-32 rounded bg-border/40" />
          </div>
        ))}
      </div>

      {/* Bloque tipo tabla/listado */}
      <div className="overflow-hidden rounded-xl border border-border/60">
        <div className="border-b border-border/60 bg-surface/80 px-4 py-3">
          <div className="h-3 w-40 rounded bg-border/70" />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border/40 px-4 py-4 last:border-0">
            <div className="h-3 w-16 rounded bg-border/50" />
            <div className="h-3 flex-1 rounded bg-border/40" />
            <div className="h-3 w-24 rounded bg-border/50" />
            <div className="h-3 w-20 rounded bg-border/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
