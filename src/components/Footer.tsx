import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface/50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-3">
            <span className="text-base font-semibold tracking-tight text-foreground">
              Garcia Propiedades
            </span>
            <p className="text-sm text-muted leading-relaxed max-w-xs">
              Tu portal inmobiliario de confianza para encontrar casas, departamentos, campos y terrenos en Corrientes.
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Contacto
            </span>
            <ul className="flex flex-col gap-2 text-sm text-muted">
              <li>Mendoza Nº 1055, Corrientes.</li>
              <li>
                <a href="mailto:info@garciapropiedades.com" className="hover:text-accent transition-colors">
                  info@garciapropiedades.com
                </a>
              </li>
              <li>+54 (379) 444-5566</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Enlaces
            </span>
            <div className="flex gap-6 text-sm text-muted">
              <Link href="/" className="hover:text-accent transition-colors">
                Inicio
              </Link>
              <Link href="/propiedades" className="hover:text-accent transition-colors">
                Propiedades
              </Link>
              <Link href="/backoffice" className="hover:text-accent transition-colors">
                Backoffice
              </Link>
            </div>
          </div>
        </div>
        
        <div className="mt-12 border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <p>© {new Date().getFullYear()} Garcia Propiedades. Todos los derechos reservados.</p>
          <p className="flex gap-4">
            <span className="hover:text-foreground cursor-pointer transition-colors">Términos</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Privacidad</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

