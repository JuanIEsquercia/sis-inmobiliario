"use client";

import { useTheme } from "@/lib/use-theme";

// Mismos hex que --surface en globals.css (claro/oscuro) — así el marco
// blanco/negro de la calculadora de arquiler.com combina con la tarjeta
// que la rodea en vez de quedar como un recuadro ajeno pegado encima.
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
