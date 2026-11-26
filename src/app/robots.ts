import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Rastreadores de buscadores con IA, con nombre propio y permiso
// explícito. La regla "*" ya los dejaba pasar, pero hay dos motivos para
// nombrarlos:
//   - deja por escrito la decisión: queremos que ChatGPT, Perplexity,
//     Claude, Gemini y compañía lean el catálogo y lo citen;
//   - un rastreador que encuentra un grupo con su nombre IGNORA el
//     grupo "*", así que cada grupo repite el bloqueo del backoffice.
//
// Los "-User" son los que entran cuando una persona le pide a la IA que
// abra una página puntual; los "Search"/"Bot", los que indexan.
const AI_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // El backoffice ya exige login (proxy.ts) y marca robots:noindex
        // en su propia metadata — esto es la primera línea de defensa,
        // para que ni siquiera se rastree.
        disallow: "/backoffice",
      },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: "/backoffice" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
