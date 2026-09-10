import Script from "next/script";

// Widget de chat de Kommo CRM — el botón flotante que aparece en el
// sitio público y deriva la conversación al CRM de la inmobiliaria. Se
// monta solo en el layout del sitio ((site)/layout.tsx), nunca en el
// backoffice.
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
const KOMMO_SNIPPET = `(function(a,m,o,c,r,m){a[m]={id:"1080589",hash:"322ffd978e4f1f0fb0a821c34f83aee714ad7a7b38c054b4b920a6aa4860b21f",locale:"es",setMeta:function(p){this.params=(this.params||[]).concat([p])}};a[o]=a[o]||function(){(a[o].q=a[o].q||[]).push(arguments)};var d=a.document,s=d.createElement('script');s.async=true;s.id=m+'_script';s.src='https://gso.kommo.com/js/button.js';d.head&&d.head.appendChild(s)}(window,0,'crmPlugin',0,0,'crm_plugin'));`;

export function CrmChatButton() {
  return (
    <Script
      id="kommo-crm-chat"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{ __html: KOMMO_SNIPPET }}
    />
  );
}
