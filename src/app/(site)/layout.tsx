import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CrmChatButton } from "@/components/CrmChatButton";
import { SITE_URL, SITE_NAME, BUSINESS, absoluteUrl } from "@/lib/seo";

// RealEstateAgent (subtipo de LocalBusiness) — describe el negocio en
// sí, no una página puntual, así que va una sola vez acá y queda en
// todas las páginas del sitio público. No es un "rich result" clásico
// de Google (no hay una viñeta especial garantizada para esto), pero sí
// alimenta el Knowledge Graph y las respuestas de buscadores con IA —
// además de ser la fuente correcta para que Google Business Profile y
// el sitio digan exactamente lo mismo (nombre, dirección, horario).
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: SITE_NAME,
  url: SITE_URL,
  image: absoluteUrl("/logo-light.png"),
  telephone: BUSINESS.telephone,
  address: {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.streetAddress,
    addressLocality: BUSINESS.addressLocality,
    addressRegion: BUSINESS.addressRegion,
    addressCountry: BUSINESS.addressCountry,
  },
  areaServed: "Corrientes, Argentina",
  openingHours: BUSINESS.openingHours,
  sameAs: [BUSINESS.instagram],
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Patrón oficial de Next para JSON-LD: un <script> normal dentro
          del Server Component, sin pasar por next/script. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CrmChatButton />
    </div>
  );
}
