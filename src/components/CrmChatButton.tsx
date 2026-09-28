import Script from "next/script";

// Widget de chat de Kommo CRM — el botón flotante que aparece en el
// sitio público y deriva la conversación al CRM de la inmobiliaria. Se
// monta solo en el layout del sitio ((site)/layout.tsx), nunca en el
// backoffice.
//
// OJO: montarlo solo acá NO alcanza por sí solo para que no aparezca en
// el panel. El snippet se inyecta a sí mismo en document.head y el
// button.js que trae dibuja el botón en document.body — todo fuera del
// árbol de React. Si se cruza al backoffice con navegación client-side
// (<Link>), React desmonta este componente pero el botón ya inyectado
// queda flotando igual, porque nunca fue suyo. Por eso el enlace al
// backoffice del Footer es un <a> y no un <Link>: fuerza recarga de
// documento y ahí sí se limpia todo. Si algún día se agrega otro enlace
// del sitio público al panel, tiene que ser <a> por el mismo motivo.
//
// El id y el hash son de un embed público de Kommo (van en el HTML de
// cada página para que cualquier visitante lo use — no son secretos,
// mismo criterio que el teléfono y el Instagram, hardcodeados en el
// código). Snippet oficial de Kommo, va tal cual: es un IIFE que arma
// window.crm_plugin con la config y después inyecta button.js.
//
// strategy="lazyOnload" es lo que la propia doc de Next recomienda para
// "Chat support plugins": carga en tiempo ocioso del navegador, después
// de que el resto de la página ya terminó, para no competir con el
// contenido real.
const KOMMO_SNIPPET = `(function(a,m,o,c,r,m){a[m]={id:"1080599",hash:"fe08d058db29ea337b276d5e9f0c741db66669f73aaea228414f6cf95c7e750d",locale:"es",setMeta:function(p){this.params=(this.params||[]).concat([p])}};a[o]=a[o]||function(){(a[o].q=a[o].q||[]).push(arguments)};var d=a.document,s=d.createElement('script');s.async=true;s.id=m+'_script';s.src='https://gso.kommo.com/js/button.js';d.head&&d.head.appendChild(s)}(window,0,'crmPlugin',0,0,'crm_plugin'));`;

export function CrmChatButton() {
  return (
    <Script
      id="kommo-crm-chat"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{ __html: KOMMO_SNIPPET }}
    />
  );
}
