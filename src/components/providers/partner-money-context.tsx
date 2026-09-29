"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FxRates } from "@/lib/fx";
import { DEFAULT_FX_RATES } from "@/lib/fx";
import {
  DEFAULT_PARTNER_PRICING_CURRENCY,
  isPartnerPricingCurrency,
  type PartnerPricingCurrency,
} from "@/lib/partners/company-settings";
import { PARTNER_CURRENCY_COOKIE, PARTNER_CURRENCY_STORAGE } from "@/lib/i18n/partner-config";
import { persistPref, resolveClientPref } from "@/lib/i18n/pref-storage";
import { convertFromEur, formatMoney, roundMoney } from "@/lib/utils";

export const PARTNER_CURRENCY_EVENT = "partner-pricing-currency-change";

type PartnerMoneyContextValue = {
  pricingCurrency: PartnerPricingCurrency;
  fxRates: FxRates;
  setPricingCurrency: (currency: PartnerPricingCurrency) => void;
  /** Convert stored EUR → partner display amount (number). */
  fromEur: (amountEur: number) => number;
  /** Format stored EUR with the active partner currency symbol. */
  formatEur: (amountEur: number) => string;
};

const PartnerMoneyContext = createContext<PartnerMoneyContextValue | null>(null);

export function PartnerMoneyProvider({
  children,
  initialCurrency = DEFAULT_PARTNER_PRICING_CURRENCY,
  fxRates = DEFAULT_FX_RATES,
}: {
  children: React.ReactNode;
  initialCurrency?: PartnerPricingCurrency;
  fxRates?: FxRates;
}) {
  const [pricingCurrency, setPricingCurrencyState] = useState<PartnerPricingCurrency>(
    initialCurrency,
  );
  const rates = fxRates || DEFAULT_FX_RATES;

  useEffect(() => {
    const next = resolveClientPref(
      PARTNER_CURRENCY_COOKIE,
      PARTNER_CURRENCY_STORAGE,
      (value) => isPartnerPricingCurrency(value),
      initialCurrency,
    );
    if (isPartnerPricingCurrency(next)) setPricingCurrencyState(next);
  }, [initialCurrency]);

  useEffect(() => {
    const onExternal = (event: Event) => {
      const detail = (event as CustomEvent<PartnerPricingCurrency>).detail;
      if (detail === "USD" || detail === "EUR" || detail === "GEL") {
        setPricingCurrencyState(detail);
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === PARTNER_CURRENCY_STORAGE &&
        event.newValue &&
        isPartnerPricingCurrency(event.newValue)
      ) {
        setPricingCurrencyState(event.newValue);
      }
    };
    const onPref = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; value: string }>).detail;
      if (
        detail?.key === PARTNER_CURRENCY_STORAGE &&
        isPartnerPricingCurrency(detail.value)
      ) {
        setPricingCurrencyState(detail.value);
      }
    };
    window.addEventListener(PARTNER_CURRENCY_EVENT, onExternal);
    window.addEventListener("storage", onStorage);
    window.addEventListener("rac-pref-change", onPref as EventListener);
    return () => {
      window.removeEventListener(PARTNER_CURRENCY_EVENT, onExternal);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("rac-pref-change", onPref as EventListener);
    };
  }, []);

  const setPricingCurrency = useCallback((next: PartnerPricingCurrency) => {
    setPricingCurrencyState(next);
    persistPref(PARTNER_CURRENCY_COOKIE, PARTNER_CURRENCY_STORAGE, next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(PARTNER_CURRENCY_EVENT, { detail: next }),
      );
    }
  }, []);

  const fromEur = useCallback(
    (amountEur: number) => roundMoney(convertFromEur(amountEur, pricingCurrency, rates)),
    [pricingCurrency, rates],
  );

  const formatEur = useCallback(
    (amountEur: number) => formatMoney(amountEur, pricingCurrency, rates),
    [pricingCurrency, rates],
  );

  const value = useMemo<PartnerMoneyContextValue>(
    () => ({
      pricingCurrency,
      fxRates: rates,
      setPricingCurrency,
      fromEur,
      formatEur,
    }),
    [pricingCurrency, rates, setPricingCurrency, fromEur, formatEur],
  );

  return (
    <PartnerMoneyContext.Provider value={value}>{children}</PartnerMoneyContext.Provider>
  );
}

export function usePartnerMoney() {
  const ctx = useContext(PartnerMoneyContext);
  if (!ctx) throw new Error("usePartnerMoney must be used within PartnerMoneyProvider");
  return ctx;
}

export function usePartnerMoneyOptional() {
  return useContext(PartnerMoneyContext);
}
