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
  experimental: {
    // Hover-prefetched pages (prices, availability) are reused for at most 60 s.
    // Dynamic pages stay uncached so partners and admins always see their saves.
    staleTimes: { static: 60 },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [{ pathname: "/uploads/**" }, { pathname: "/images/**" }],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
