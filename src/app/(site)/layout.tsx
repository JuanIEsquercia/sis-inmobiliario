import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CrmChatButton } from "@/components/CrmChatButton";
import { organizationJsonLd, websiteJsonLd, jsonLdScript } from "@/lib/structured-data";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Patrón oficial de Next para JSON-LD: un <script> normal dentro
          del Server Component, sin pasar por next/script. */}
      {/* La inmobiliaria (RealEstateAgent) y el sitio (WebSite) — ver
          lib/structured-data.ts. Van una sola vez acá y quedan en todas
          las páginas del sitio público. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd()) }} />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CrmChatButton />
    </div>
  );
}
