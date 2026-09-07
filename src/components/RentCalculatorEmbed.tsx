"use client";

import { useTheme } from "@/lib/use-theme";

// Compartido entre el backoffice (Administraciones > Actualizaciones) y
// el sitio público (sección "Calculá tu aumento" en la home) — mismo
// iframe de arquiler.com en los dos lados, por eso vive fuera de
// components/backoffice.
//
// Mismos hex que --surface en globals.css (claro/oscuro) — así el marco
// blanco/negro de la calculadora combina con la tarjeta que la rodea en
// vez de quedar como un recuadro ajeno pegado encima.
const SURFACE_HEX = { light: "ffffff", dark: "1c1817" };

export function RentCalculatorEmbed() {
  const { resolvedTheme } = useTheme();
  const backgroundColor = SURFACE_HEX[resolvedTheme];

  return (
    <iframe
      key={resolvedTheme}
      title="Calculadora de alquileres"
      src={`https://arquiler.com/mini?theme=${resolvedTheme}&backgroundColor=${backgroundColor}`}
      className="mx-auto block h-[600px] w-full max-w-[800px] rounded-xl"
    />
  );
}
