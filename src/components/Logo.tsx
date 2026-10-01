"use client";

import { useTheme } from "@/lib/use-theme";
import Image from "next/image";
import { useMounted } from "@/lib/use-mounted";

export function Logo() {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();

  const src = mounted && resolvedTheme === "dark" ? "/logo-dark.png" : "/logo-light.png";

  return (
    <Image
      src={src}
      alt="Garcia Propiedades"
      width={4550}
      height={3371}
      // Sin el optimizador de Vercel: su cupo mensual se agotó y
      // devolvía 402, así que el logo no cargaba en NINGUNA pantalla
      // (ver adinco-images.ts para el detalle de por qué se agotó).
      //
      // PENDIENTE: el archivo mide 4550 px y pesa 110 KB para mostrarse
      // a 56 px de alto. Antes eso lo disimulaba el optimizador. Exportar
      // una versión de ~600 px lo dejaría en unos 15 KB. Hay que hacerlo
      // desde el diseño original, no recortando el PNG grande.
      unoptimized
      priority
      className="h-10 sm:h-12 md:h-14 w-auto object-contain transition-all"
    />
  );
}
