// Barra de búsqueda por sección: un <input> dentro de un <form> GET sin
// JS — la propia página, del lado del servidor, lee `?q=` de
// searchParams y filtra con él. Mismo patrón repetido en Clientes,
// Administraciones, Historial, Ventas y Tasaciones — server component,
// no hace falta "use client".
export function SearchField({
  name = "q",
  defaultValue,
  placeholder,
  className,
}: {
  name?: string;
  defaultValue?: string;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={`relative w-full ${className ?? ""}`}>
      <input name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} className="field w-full pl-10" />
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/70">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="m21 21-4.3-4.3" />
        </svg>
      </div>
    </div>
  );
}
