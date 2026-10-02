import { useCallback, useSyncExternalStore } from "react";

// ¿Se cumple una media query ahora mismo? Reacciona a los cambios
// (rotar el teléfono, achicar la ventana).
//
// Va con useSyncExternalStore y no con useState + useEffect, que es lo
// primero que uno escribe: matchMedia es exactamente eso, un estado que
// vive afuera de React y avisa cuando cambia, y para eso está esta API.
// La versión con efecto además la rechaza el lint del proyecto
// (react-hooks/set-state-in-effect), con razón: provoca un render de más
// en cada montaje.
//
// El tercer argumento es el valor del servidor, donde no hay ventana que
// medir. Devuelve false a propósito: lo que dependa del tamaño de
// pantalla arranca apagado y se enciende al hidratar, nunca al revés —
// así el HTML del servidor coincide con el primer render del cliente.
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (alCambiar: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", alCambiar);
      return () => mq.removeEventListener("change", alCambiar);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}
