import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/health"],
        disallow: [
          "/adminoperations",
          "/adminoperations/",
          "/partner-portal",
          "/partner-portal/",
          "/business-portal",
          "/business-portal/",
          "/account",
          "/account/",
          "/invoice",
          "/invoice/",
          "/reviews/",
          "/admin",
          "/vendor",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
