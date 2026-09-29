"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  BUSINESS_PARTNER_CURRENCY_COOKIE,
  BUSINESS_PARTNER_CURRENCY_STORAGE,
  BUSINESS_PARTNER_LOCALE_COOKIE,
  BUSINESS_PARTNER_LOCALE_STORAGE,
  DEFAULT_BUSINESS_PARTNER_CURRENCY,
  DEFAULT_BUSINESS_PARTNER_LOCALE,
  isBusinessPartnerCurrency,
  isBusinessPartnerLocale,
  type BusinessPartnerCurrency,
  type BusinessPartnerLocale,
} from "@/lib/i18n/business-partner-config";
import { applyDocumentLocale, persistPref, resolveClientPref } from "@/lib/i18n/pref-storage";
import { DEFAULT_FX_RATES, type FxRates } from "@/lib/fx";

type BusinessPartnerPreferences = {
  locale: BusinessPartnerLocale;
  currency: BusinessPartnerCurrency;
  fxRates: FxRates;
  setLocale: (locale: BusinessPartnerLocale) => void;
  setCurrency: (currency: BusinessPartnerCurrency) => void;
};

const BusinessPartnerPreferencesContext = createContext<BusinessPartnerPreferences | null>(null);

export function BusinessPartnerPreferencesProvider({
  children,
  initialLocale,
  initialCurrency,
  fxRates = DEFAULT_FX_RATES,
}: {
  children: React.ReactNode;
  initialLocale: BusinessPartnerLocale;
  initialCurrency: BusinessPartnerCurrency;
  fxRates?: FxRates;
}) {
  const rates = fxRates || DEFAULT_FX_RATES;
  const [locale, setLocaleState] = useState<BusinessPartnerLocale>(
    initialLocale || DEFAULT_BUSINESS_PARTNER_LOCALE,
  );
  const [currency, setCurrencyState] = useState<BusinessPartnerCurrency>(
    initialCurrency || DEFAULT_BUSINESS_PARTNER_CURRENCY,
  );

  useEffect(() => {
    const nextLocale = resolveClientPref(
      BUSINESS_PARTNER_LOCALE_COOKIE,
      BUSINESS_PARTNER_LOCALE_STORAGE,
      (v) => isBusinessPartnerLocale(v),
      initialLocale || DEFAULT_BUSINESS_PARTNER_LOCALE,
    ) as BusinessPartnerLocale;
    const nextCurrency = resolveClientPref(
      BUSINESS_PARTNER_CURRENCY_COOKIE,
      BUSINESS_PARTNER_CURRENCY_STORAGE,
      (v) => isBusinessPartnerCurrency(v),
      initialCurrency || DEFAULT_BUSINESS_PARTNER_CURRENCY,
    ) as BusinessPartnerCurrency;
    setLocaleState(nextLocale);
    setCurrencyState(nextCurrency);
  }, [initialLocale, initialCurrency]);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === BUSINESS_PARTNER_LOCALE_STORAGE && e.newValue && isBusinessPartnerLocale(e.newValue)) {
        setLocaleState(e.newValue);
      }
      if (
        e.key === BUSINESS_PARTNER_CURRENCY_STORAGE &&
        e.newValue &&
        isBusinessPartnerCurrency(e.newValue)
      ) {
        setCurrencyState(e.newValue);
      }
    };
    const onPref = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string; value: string }>).detail;
      if (!detail) return;
      if (detail.key === BUSINESS_PARTNER_LOCALE_STORAGE && isBusinessPartnerLocale(detail.value)) {
        setLocaleState(detail.value);
      }
      if (detail.key === BUSINESS_PARTNER_CURRENCY_STORAGE && isBusinessPartnerCurrency(detail.value)) {
        setCurrencyState(detail.value);
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("rac-pref-change", onPref as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("rac-pref-change", onPref as EventListener);
    };
  }, []);

  const setLocale = useCallback((next: BusinessPartnerLocale) => {
    setLocaleState(next);
    persistPref(BUSINESS_PARTNER_LOCALE_COOKIE, BUSINESS_PARTNER_LOCALE_STORAGE, next);
  }, []);

  const setCurrency = useCallback((next: BusinessPartnerCurrency) => {
    setCurrencyState(next);
    persistPref(BUSINESS_PARTNER_CURRENCY_COOKIE, BUSINESS_PARTNER_CURRENCY_STORAGE, next);
  }, []);

  const value = useMemo<BusinessPartnerPreferences>(
    () => ({
      locale,
      currency,
      fxRates: rates,
      setLocale,
      setCurrency,
    }),
    [locale, currency, rates, setLocale, setCurrency],
  );

  return (
    <BusinessPartnerPreferencesContext.Provider value={value}>
      {children}
    </BusinessPartnerPreferencesContext.Provider>
  );
}

export function useBusinessPartnerPreferences() {
  const ctx = useContext(BusinessPartnerPreferencesContext);
  if (!ctx) {
    throw new Error("useBusinessPartnerPreferences must be used within BusinessPartnerPreferencesProvider");
  }
  return ctx;
}
