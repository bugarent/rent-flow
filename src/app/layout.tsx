import type { Metadata } from "next";
import { Suspense } from "react";
import { BootSplash } from "@/components/layout/boot-splash";
import { RouteLoadingIndicator } from "@/components/layout/route-loading-indicator";
import { PressFeedback } from "@/components/layout/press-feedback";
import { Geist, Geist_Mono, Inter, Noto_Sans_Georgian, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { PublicShell } from "@/components/layout/public-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { SEO_SITE_NAME } from "@/lib/brand";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { readPreferences } from "@/lib/server/preferences";
import { cachedFooterContact, cachedFxRates } from "@/lib/server/public-page-data";
import { isRtl } from "@/lib/i18n/config";
import { SITE_URL, PRIMARY_KEYWORDS } from "@/lib/seo/config";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  buildLocalBusinessJsonLd,
  buildServiceJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/seo/json-ld";
import { getPageSeo } from "@/lib/seo/pages";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  // The homepage LCP is the hero photo. A preloaded body font competes with it on slow mobile.
  preload: false,
});

const inter = Inter({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["600"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

// Script-specific faces load on demand via unicode-range; preloading them on every page delays LCP.
const notoGeorgian = Noto_Sans_Georgian({
  variable: "--font-noto-georgian",
  subsets: ["georgian"],
  preload: false,
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await readPreferences();
  const dictionary = getDictionary(locale);
  const page = getPageSeo("home", locale);
  const base = buildPageMetadata({
    title: page.title || dictionary.meta.title,
    description: page.description || dictionary.meta.description,
    path: "/",
    locale,
    keywords: page.keywords ? [...page.keywords] : [...PRIMARY_KEYWORDS],
  });

  return {
    ...base,
    applicationName: SEO_SITE_NAME,
    icons: {
      icon: [{ url: "/brand/rac-logo.png", type: "image/png" }],
      apple: [{ url: "/brand/rac-logo.png", type: "image/png" }],
      shortcut: "/brand/rac-logo.png",
    },
    other: {
      "og:logo": `${SITE_URL}/brand/rac-logo.png`,
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, currency } = await readPreferences();
  const { softTimeout } = await import("@/lib/server/soft-timeout");
  const { defaultFxRates } = await import("@/lib/server/preferences");
  const { emptyFooterContact } = await import("@/lib/catalog/footer-contact");
  const [fxRates, footerContact] = await Promise.all([
    softTimeout(cachedFxRates(), defaultFxRates(), 400),
    softTimeout(cachedFooterContact(), emptyFooterContact(), 400),
  ]);
  const dir = isRtl(locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${notoGeorgian.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <head>
        <link rel="preload" as="image" href="/brand/rac-logo.webp" />
        <GoogleAnalytics />
      </head>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <BootSplash />
        <style>{`#nl-badge-frame,iframe[title="Powered by Netlify"],script[src*=".netlify/scripts/hud"]{display:none!important}`}</style>
        <JsonLd
          data={[
            buildWebSiteJsonLd(),
            buildLocalBusinessJsonLd({
              phone: footerContact.phone,
              email: footerContact.email,
              address: footerContact.address,
            }),
            buildServiceJsonLd(),
          ]}
        />
        <AppProviders locale={locale} currency={currency} fxRates={fxRates}>
          <PublicShell footerContact={footerContact}>{children}</PublicShell>
        </AppProviders>
        <Suspense fallback={null}>
          <RouteLoadingIndicator />
        </Suspense>
        <PressFeedback />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'setTimeout(function(){document.documentElement.classList.add("rac-ready")},150)',
          }}
        />
      </body>
    </html>
  );
}
