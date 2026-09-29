import type { Metadata } from "next";
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
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoGeorgian = Noto_Sans_Georgian({
  variable: "--font-noto-georgian",
  subsets: ["georgian"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
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
    softTimeout(getPublicFooterContact(), emptyFooterContact(), 1500),
  ]);
  const dir = isRtl(locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${notoGeorgian.variable} ${notoArabic.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
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
      </body>
    </html>
  );
}
