"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

interface ScrollLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
}

// Wrapper de next/link para links con #hash que a veces apuntan a una
// sección de la página en la que ya se está parado (ej. la campanita de
// Alertas, abierta desde el propio dashboard, apuntando a la tabla de
// "Pendientes de cobro" más abajo en esa misma página). En ese caso el
// pathname no cambia, Next no dispara su navegación/scroll normal y el
// click no hacía nada — acá se detecta ese caso puntual y se hace el
// scroll a mano; si el destino es otra página, se deja que Link navegue
// como siempre (Next ya se encarga de llevar al #hash en una navegación
// real).
export function ScrollLink({ href, className, children, onNavigate }: ScrollLinkProps) {
  const pathname = usePathname();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    const hashIndex = href.indexOf("#");
    if (hashIndex !== -1) {
      const path = href.slice(0, hashIndex) || pathname;
      const hash = href.slice(hashIndex + 1);
      if (path === pathname) {
        e.preventDefault();
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    onNavigate?.();
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
