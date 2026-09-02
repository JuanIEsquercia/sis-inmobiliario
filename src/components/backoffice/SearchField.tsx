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
    <div className={`relative flex items-center w-full group ${className ?? ""}`}>
      <div className="pointer-events-none absolute left-4 text-accent transition-transform duration-200 group-focus-within:scale-110">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6">
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="m21 21-4.3-4.3" />
        </svg>
      </div>

      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="w-full h-13 sm:h-14 pl-12 pr-28 rounded-2xl border border-border/80 bg-surface/90 text-sm sm:text-base font-semibold text-foreground placeholder:text-muted/60 shadow-sm transition-all duration-200 focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent-soft/40 hover:border-border outline-none"
      />

      <div className="absolute right-2 flex items-center gap-1.5">
        {defaultValue && (
          <a
            href="?"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/60 text-muted hover:bg-background hover:text-foreground transition-colors cursor-pointer text-xs font-bold"
            title="Limpiar búsqueda"
          >
            ✕
          </a>
        )}
        <button
          type="submit"
          className="flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-bold text-accent-foreground shadow-sm hover:bg-accent-strong transition-all duration-200 cursor-pointer active:scale-95"
        >
          <span>Buscar</span>
        </button>
      </div>
    </div>
  );
}
