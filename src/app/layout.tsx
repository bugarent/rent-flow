import type { Metadata } from "next";
import { Suspense } from "react";
import { RouteLoadingIndicator } from "@/components/layout/route-loading-indicator";
import { Geist, Geist_Mono, Inter, Noto_Sans_Georgian, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { PublicShell } from "@/components/layout/public-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_NAME } from "@/lib/brand";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getFxRates, readPreferences } from "@/lib/server/preferences";
import { getPublicFooterContact } from "@/lib/server/footer-contact-store";
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
});

const inter = Inter({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["600"],
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
    applicationName: SITE_NAME,
    icons: {
      icon: [{ url: "/logo.png", type: "image/png" }],
      apple: [{ url: "/logo.png", type: "image/png" }],
      shortcut: "/logo.png",
    },
    other: {
      "og:logo": `${SITE_URL}/logo.png`,
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, currency } = await readPreferences();
  const { softTimeout } = await import("@/lib/server/soft-timeout");
  const { defaultFxRates } = await import("@/lib/server/preferences");
  const { emptyFooterContact } = await import("@/lib/catalog/footer-contact");
  const [fxRates, footerContact] = await Promise.all([
    softTimeout(getFxRates(), defaultFxRates(), 1500),
    softTimeout(getPublicFooterContact(), emptyFooterContact(), 6000),
  ]);
  const dir = isRtl(locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${notoGeorgian.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var sel='#nl-badge-frame,iframe[title="Powered by Netlify"],script[src*=".netlify/scripts/hud"]';function hide(root){if(root&&root.nodeType===1&&root.matches&&root.matches(sel))root.remove();var scope=root&&root.querySelectorAll?root:document;scope.querySelectorAll(sel).forEach(function(el){el.remove();});}hide(document);var st=document.createElement('style');st.textContent=sel+'{display:none!important}';document.head.appendChild(st);var mo=new MutationObserver(function(records){records.forEach(function(record){record.addedNodes.forEach(function(node){if(node.nodeType===1&&node.matches&&node.matches(sel))node.remove();});});});mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(function(){mo.disconnect();},8000);})();`,
          }}
        />
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
      </body>
    </html>
  );
}
