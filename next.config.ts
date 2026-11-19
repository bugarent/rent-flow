import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/login", destination: "/", permanent: false },
      { source: "/adminoperations", destination: "/admin505", permanent: true },
      { source: "/adminoperations/:path*", destination: "/admin505/:path*", permanent: true },
      { source: "/business-partnership", destination: "/partnership", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Homepage HTML: the edge keeps a fresh copy for a minute per language/currency
        // cookie, then may serve that copy for a day while the server wakes up. A save
        // purges the tag (lib/server/edge-cache), so a content edit does not wait out
        // the day. Browsers still get no-store; RSC navigation requests are not cached.
        source: "/",
        missing: [{ type: "header", key: "rsc" }],
        headers: [
          {
            key: "Netlify-CDN-Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=86400, durable",
          },
          { key: "Netlify-Vary", value: "cookie=rac_locale|rac_currency" },
          { key: "Netlify-Cache-Tag", value: "public-pages" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  serverExternalPackages: ["@prisma/client", "prisma", "sharp", "nodemailer", "cloudinary"],
  transpilePackages: ["@bankofgeorgia/bog-payments-web-sdk"],
  experimental: {
    // Hover-prefetched pages (prices, availability) are reused for at most 60 s.
    // Dynamic pages stay uncached so partners and admins always see their saves.
    staleTimes: { static: 60 },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // The last width becomes the <img src>. 3840 made every card refetch a huge file.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    localPatterns: [{ pathname: "/uploads/**" }, { pathname: "/images/**" }],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
