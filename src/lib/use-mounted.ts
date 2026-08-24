import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// true solo después de la hidratación en el cliente — evita el mismatch de
// SSR al leer estado que solo existe en el browser (ej. tema resuelto).
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
