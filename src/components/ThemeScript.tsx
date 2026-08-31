"use client";

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

// Aplica el tema guardado antes del primer paint (evita el flash). Tiene
// que ser un Client Component (no alcanza con ponerlo directo en el
// Server Component del layout): React 19 avisa en desarrollo ante
// cualquier <script> que aparezca al hidratar, y la forma de evitarlo es
// que el mismo componente vuelva a renderizar en el cliente cambiando el
// type de "text/javascript" (servidor — el navegador lo ejecuta al
// parsear el HTML crudo, antes de que React exista) a "text/plain"
// (cliente — inerte, ya cumplió su función). Ver
// node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md.
export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
