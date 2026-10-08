"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Currency, Locale } from "@/lib/i18n/config";
import {
  CURRENCY_COOKIE,
  CURRENCY_STORAGE,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE,
  isCurrency,
  isLocale,
  isRtl,
} from "@/lib/i18n/config";
import { applyDocumentLocale, persistPref, resolveClientPref } from "@/lib/i18n/pref-storage";
import { isAdminPath, isBusinessPartnerPath, isPartnerPath } from "@/lib/routes";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { PARTNER_LOCALE_COOKIE, PARTNER_LOCALE_STORAGE } from "@/lib/i18n/partner-config";
import { DEFAULT_FX_RATES, type FxRates } from "@/lib/fx";
import { formatMoney } from "@/lib/utils";

type Preferences = {
  locale: Locale;
  currency: Currency;
  dictionary: Dictionary;
  dir: "ltr" | "rtl";
  fxRates: FxRates;
  /** @deprecated use fxRates.eurUsd */
  eurUsdRate: number;
  formatPrice: (amountEur: number) => string;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
};

const PreferencesContext = createContext<Preferences | null>(null);

export function PreferencesProvider({
  children,
  initialLocale,
  initialCurrency,
  fxRates = DEFAULT_FX_RATES,
  eurUsdRate,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialCurrency: Currency;
  fxRates?: FxRates;
  /** @deprecated pass fxRates instead */
  eurUsdRate?: number;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const publicSurface =
    !isAdminPath(pathname) && !isPartnerPath(pathname) && !isBusinessPartnerPath(pathname);
  const rates = useMemo<FxRates>(
    () =>
      fxRates ?? {
        ...DEFAULT_FX_RATES,
        eurUsd: eurUsdRate ?? DEFAULT_FX_RATES.eurUsd,
      },
    [fxRates, eurUsdRate],
  );
  const [locale, setLocaleState] = useState<Locale>(initialLocale || DEFAULT_LOCALE);
  const [currency, setCurrencyState] = useState<Currency>(initialCurrency || DEFAULT_CURRENCY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const nextLocale = resolveClientPref(
      LOCALE_COOKIE,
      LOCALE_STORAGE,
      (v) => isLocale(v),
      initialLocale || DEFAULT_LOCALE,
    ) as Locale;
    setLocaleState(nextLocale);

    const nextCurrency = resolveClientPref(
      CURRENCY_COOKIE,
      CURRENCY_STORAGE,
      (v) => isCurrency(v),
      initialCurrency || DEFAULT_CURRENCY,
    ) as Currency;
    setCurrencyState(nextCurrency);
    setHydrated(true);
  }, [initialCurrency, initialLocale]);

  useEffect(() => {
    if (!publicSurface) return;
    applyDocumentLocale(locale);
  }, [locale, publicSurface]);

  useEffect(() => {
    if (!hydrated || !publicSurface) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCALE_STORAGE && e.newValue && isLocale(e.newValue)) {
        setLocaleState(e.newValue);
        router.refresh();
      }
      if (e.key === CURRENCY_STORAGE && e.newValue && isCurrency(e.newValue)) {
        setCurrencyState(e.newValue);
      }
    };
    const onPref = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string; value: string }>).detail;
      if (detail?.key === LOCALE_STORAGE && isLocale(detail.value)) {
        setLocaleState(detail.value);
      }
      if (detail?.key === CURRENCY_STORAGE && isCurrency(detail.value)) {
        setCurrencyState(detail.value);
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("rac-pref-change", onPref as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("rac-pref-change", onPref as EventListener);
    };
  }, [hydrated, publicSurface, router]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      persistPref(LOCALE_COOKIE, LOCALE_STORAGE, next);
      persistPref(PARTNER_LOCALE_COOKIE, PARTNER_LOCALE_STORAGE, next);
      router.refresh();
    },
    [router],
  );

  const setCurrency = useCallback(
    (next: Currency) => {
      setCurrencyState(next);
      persistPref(CURRENCY_COOKIE, CURRENCY_STORAGE, next);
      router.refresh();
    },
    [router],
  );

  const value = useMemo<Preferences>(
    () => ({
      locale,
      currency,
      dictionary: getDictionary(locale),
      dir: isRtl(locale) ? "rtl" : "ltr",
      fxRates: rates,
      eurUsdRate: rates.eurUsd,
      formatPrice: (amountEur: number) => formatMoney(amountEur, currency, rates),
      setLocale,
      setCurrency,
    }),
    [locale, currency, rates, setLocale, setCurrency],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
