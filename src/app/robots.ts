import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

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
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
