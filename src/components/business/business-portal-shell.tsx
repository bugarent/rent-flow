"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { CurrencySelect, LanguageSelect } from "@/components/layout/header-selects";
import { useBusinessPartnerPreferences } from "@/components/providers/business-partner-preferences-context";
import { BUSINESS_PARTNER_BASE, BUSINESS_PARTNER_LOGIN } from "@/lib/routes";
import { HERO_BACKGROUND_URL } from "@/lib/brand";
import { cn } from "@/lib/utils";

function isLoginPath(pathname: string) {
  return pathname === BUSINESS_PARTNER_LOGIN || pathname.startsWith(`${BUSINESS_PARTNER_LOGIN}/`);
}

/**
 * Dedicated chrome for business-partner cabinet (no public bottom nav / customer header).
 */
export function BusinessPortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || BUSINESS_PARTNER_BASE;
  const login = isLoginPath(pathname);
  const { locale, setLocale, currency, setCurrency } = useBusinessPartnerPreferences();

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-slate-50">
      {!login ? (
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
            style={{ backgroundImage: `url('${HERO_BACKGROUND_URL}')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b1f4b]/25 via-slate-50/90 to-slate-50" />
        </div>
      ) : null}

      <header
        className={cn(
          "sticky top-0 z-50 border-b",
          login
            ? "border-slate-200 bg-white"
            : "border-slate-800/80 bg-[#0b1f4b] text-white shadow-sm",
        )}
      >
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4 sm:h-16">
          <Link
            href={login ? "/" : BUSINESS_PARTNER_BASE}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-2 py-1.5",
              login ? "bg-slate-50" : "bg-white/10",
            )}
            aria-label="Rentairportcars.com"
          >
            <BrandLogo size="md" />
          </Link>
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-sm font-extrabold",
              login ? "text-[#0b1f4b]" : "text-white",
            )}
          >
            Business Partner
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <CurrencySelect currency={currency} onChange={setCurrency} />
            <LanguageSelect locale={locale} onChange={setLocale} />
          </div>
        </div>
      </header>

      <div className="relative z-0 flex-1">{children}</div>
    </div>
  );
}
