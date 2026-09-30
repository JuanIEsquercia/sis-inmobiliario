"use client";

import { useEffect, useRef, useState } from "react";

interface ShareButtonProps {
  /** URL absoluta y canónica de la propiedad (la del código, no el id). */
  url: string;
  /** Texto institucional que acompaña al link. */
  message: string;
}

// Botón para que el agente comparta una propiedad desde la ficha, con un
// texto armado por el sistema en vez de escrito a mano cada vez.
//
// En celular usa el menú nativo de compartir (navigator.share), que es lo
// que el agente ya sabe usar y le ofrece WhatsApp, Instagram, mail y
// todo lo que tenga instalado. En escritorio ese menú no existe en casi
// ningún navegador, así que se muestran las opciones directas.
//
// El link que viaja es siempre el canónico por código: ese es el que
// genera la previsualización con foto, logo, precio y código (ver
// opengraph-image.tsx del segmento).
export function ShareButton({ url, message }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const textoCompleto = `${message}\n${url}`;

  async function compartir() {
    // La capacidad se chequea acá, en el clic, y no se guarda en estado:
    // navigator.share no existe en el servidor, así que leerlo durante el
    // render desincronizaría el HTML del servidor con el del cliente.
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ text: message, url });
        return;
      } catch {
        // El usuario canceló, o el navegador lo rechazó: se cae al menú
        // propio en vez de dejarlo sin nada.
      }
    }
    setOpen((v) => !v);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoCompleto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      setCopiado(false);
    }
    setOpen(false);
  }

  const opciones = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(textoCompleto)}`,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: "Correo",
      href: `mailto:?subject=${encodeURIComponent(message)}&body=${encodeURIComponent(textoCompleto)}`,
    },
  ];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={compartir}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent cursor-pointer"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
          />
        </svg>
        {copiado ? "¡Link copiado!" : "Compartir"}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-border bg-surface shadow-premium"
        >
          {opciones.map((o) => (
            <a
              key={o.label}
              role="menuitem"
              href={o.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              {o.label}
            </a>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={copiar}
            className="block w-full border-t border-border/50 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-background cursor-pointer"
          >
            Copiar link
          </button>
        </div>
      )}
    </div>
  );
}
