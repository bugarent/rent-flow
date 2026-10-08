"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_PARTNER_LOCALE,
  PARTNER_LOCALE_COOKIE,
  PARTNER_LOCALE_STORAGE,
  isPartnerLocale,
  type PartnerLocale,
} from "@/lib/i18n/partner-config";
import { applyDocumentLocale, persistPref, resolveClientPref } from "@/lib/i18n/pref-storage";
import { getPartnerDictionary, type PartnerDictionary } from "@/lib/i18n/partner-dictionaries";
import { LOCALE_COOKIE, LOCALE_STORAGE, isLocale } from "@/lib/i18n/config";

type PartnerLocaleContextValue = {
  locale: PartnerLocale;
  dictionary: PartnerDictionary;
  setLocale: (locale: PartnerLocale) => void;
};

const PartnerLocaleContext = createContext<PartnerLocaleContextValue | null>(null);

export function PartnerLocaleProvider({
  children,
  initialLocale,
  lockToInitial = false,
}: {
  children: React.ReactNode;
  initialLocale: PartnerLocale;
  /** Admin review embeds the partner form and must follow the admin language, not the partner cookie. */
  lockToInitial?: boolean;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<PartnerLocale>(initialLocale || DEFAULT_PARTNER_LOCALE);

  useEffect(() => {
    if (lockToInitial) {
      setLocaleState(initialLocale || DEFAULT_PARTNER_LOCALE);
      return;
    }
    const shared = resolveClientPref(
      LOCALE_COOKIE,
      LOCALE_STORAGE,
      (v) => isLocale(v),
      "",
    );
    const stored = resolveClientPref(
      PARTNER_LOCALE_COOKIE,
      PARTNER_LOCALE_STORAGE,
      (v) => isPartnerLocale(v),
      initialLocale || DEFAULT_PARTNER_LOCALE,
    ) as PartnerLocale;
    const next = (isPartnerLocale(shared) ? shared : stored) as PartnerLocale;
    setLocaleState(next);
    if (next !== stored) {
      persistPref(PARTNER_LOCALE_COOKIE, PARTNER_LOCALE_STORAGE, next);
    }
  }, [initialLocale, lockToInitial]);

  useEffect(() => {
    if (lockToInitial) return;
    applyDocumentLocale(locale);
  }, [locale, lockToInitial]);

  useEffect(() => {
    if (lockToInitial) return;
    const onStorage = (e: StorageEvent) => {
      if (
        (e.key === PARTNER_LOCALE_STORAGE || e.key === LOCALE_STORAGE) &&
        e.newValue &&
        isPartnerLocale(e.newValue)
      ) {
        setLocaleState(e.newValue);
      }
    };
    const onPref = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string; value: string }>).detail;
      if (
        (detail?.key === PARTNER_LOCALE_STORAGE || detail?.key === LOCALE_STORAGE) &&
        isPartnerLocale(detail.value)
      ) {
        setLocaleState(detail.value);
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("rac-pref-change", onPref as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("rac-pref-change", onPref as EventListener);
    };
  }, [lockToInitial]);

  const setLocale = useCallback(
    (next: PartnerLocale) => {
      setLocaleState(next);
      persistPref(PARTNER_LOCALE_COOKIE, PARTNER_LOCALE_STORAGE, next);
      persistPref(LOCALE_COOKIE, LOCALE_STORAGE, next);
      router.refresh();
    },
    [router],
  );

  const value = useMemo<PartnerLocaleContextValue>(
    () => ({
      locale,
      dictionary: getPartnerDictionary(locale),
      setLocale,
    }),
    [locale, setLocale],
  );

  return <PartnerLocaleContext.Provider value={value}>{children}</PartnerLocaleContext.Provider>;
}

export function usePartnerLocale() {
  const ctx = useContext(PartnerLocaleContext);
  if (!ctx) throw new Error("usePartnerLocale must be used within PartnerLocaleProvider");
  return ctx;
}

export function usePartnerLocaleOptional() {
  return useContext(PartnerLocaleContext);
}
