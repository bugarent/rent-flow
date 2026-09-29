"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ADMIN_CURRENCY_COOKIE,
  ADMIN_CURRENCY_STORAGE,
  ADMIN_LOCALE_COOKIE,
  ADMIN_LOCALE_STORAGE,
  DEFAULT_ADMIN_CURRENCY,
  DEFAULT_ADMIN_LOCALE,
  isAdminCurrency,
  isAdminLocale,
  type AdminCurrency,
  type AdminLocale,
} from "@/lib/i18n/admin-config";
import { applyDocumentLocale, persistPref, resolveClientPref } from "@/lib/i18n/pref-storage";
import { getAdminDictionary, type AdminDictionary } from "@/lib/i18n/admin-dictionaries";
import { DEFAULT_FX_RATES, type FxRates } from "@/lib/fx";
import { convertFromEur, formatMoney, formatMoneyAmount, roundMoney } from "@/lib/utils";

type AdminLocaleContextValue = {
  locale: AdminLocale;
  dictionary: AdminDictionary;
  setLocale: (locale: AdminLocale) => void;
  currency: AdminCurrency;
  fxRates: FxRates;
  setCurrency: (currency: AdminCurrency) => void;
  /** Format a stored EUR amount in the admin display currency. */
  formatEur: (amountEur: number) => string;
  /** Convert EUR → display currency number. */
  fromEur: (amountEur: number) => number;
};

const AdminLocaleContext = createContext<AdminLocaleContextValue | null>(null);

export function AdminLocaleProvider({
  children,
  initialLocale,
  initialCurrency = DEFAULT_ADMIN_CURRENCY,
  fxRates = DEFAULT_FX_RATES,
}: {
  children: React.ReactNode;
  initialLocale: AdminLocale;
  initialCurrency?: AdminCurrency;
  fxRates?: FxRates;
}) {
  const router = useRouter();
  const rates = fxRates || DEFAULT_FX_RATES;
  const [locale, setLocaleState] = useState<AdminLocale>(initialLocale || DEFAULT_ADMIN_LOCALE);
  const [currency, setCurrencyState] = useState<AdminCurrency>(
    initialCurrency || DEFAULT_ADMIN_CURRENCY,
  );

  useEffect(() => {
    const nextLocale = resolveClientPref(
      ADMIN_LOCALE_COOKIE,
      ADMIN_LOCALE_STORAGE,
      (v) => isAdminLocale(v),
      initialLocale || DEFAULT_ADMIN_LOCALE,
    ) as AdminLocale;
    const nextCurrency = resolveClientPref(
      ADMIN_CURRENCY_COOKIE,
      ADMIN_CURRENCY_STORAGE,
      (v) => isAdminCurrency(v),
      initialCurrency || DEFAULT_ADMIN_CURRENCY,
    ) as AdminCurrency;
    setLocaleState(nextLocale);
    setCurrencyState(nextCurrency);
  }, [initialLocale, initialCurrency]);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_LOCALE_STORAGE && e.newValue && isAdminLocale(e.newValue)) {
        setLocaleState(e.newValue);
      }
      if (e.key === ADMIN_CURRENCY_STORAGE && e.newValue && isAdminCurrency(e.newValue)) {
        setCurrencyState(e.newValue);
      }
    };
    const onPref = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string; value: string }>).detail;
      if (!detail) return;
      if (detail.key === ADMIN_LOCALE_STORAGE && isAdminLocale(detail.value)) {
        setLocaleState(detail.value);
      }
      if (detail.key === ADMIN_CURRENCY_STORAGE && isAdminCurrency(detail.value)) {
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

  const setLocale = useCallback(
    (next: AdminLocale) => {
      setLocaleState(next);
      persistPref(ADMIN_LOCALE_COOKIE, ADMIN_LOCALE_STORAGE, next);
      router.refresh();
    },
    [router],
  );

  const setCurrency = useCallback((next: AdminCurrency) => {
    setCurrencyState(next);
    persistPref(ADMIN_CURRENCY_COOKIE, ADMIN_CURRENCY_STORAGE, next);
  }, []);

  const fromEur = useCallback(
    (amountEur: number) => roundMoney(convertFromEur(amountEur, currency, rates)),
    [currency, rates],
  );

  const formatEur = useCallback(
    (amountEur: number) => formatMoney(amountEur, currency, rates),
    [currency, rates],
  );

  const value = useMemo<AdminLocaleContextValue>(
    () => ({
      locale,
      dictionary: getAdminDictionary(locale),
      setLocale,
      currency,
      fxRates: rates,
      setCurrency,
      formatEur,
      fromEur,
    }),
    [locale, setLocale, currency, rates, setCurrency, formatEur, fromEur],
  );

  return <AdminLocaleContext.Provider value={value}>{children}</AdminLocaleContext.Provider>;
}

export function useAdminLocale() {
  const ctx = useContext(AdminLocaleContext);
  if (!ctx) throw new Error("useAdminLocale must be used within AdminLocaleProvider");
  return ctx;
}

/** Format an amount that is already in the display currency. */
export function formatAdminAmount(amount: number, currency: AdminCurrency) {
  return formatMoneyAmount(amount, currency);
}
