"use client";

import { usePreferences } from "@/components/providers/preferences-context";
import { usePartnerLocaleOptional } from "@/components/providers/partner-locale-context";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

/**
 * Public pages use the public locale. Inside the partner cabinet, the same
 * widgets follow the partner locale so a homepage language change does not
 * rewrite partner screens.
 */
export function useSurfaceDictionary(): { locale: Locale; dictionary: Dictionary } {
  const prefs = usePreferences();
  const partner = usePartnerLocaleOptional();
  if (!partner) return { locale: prefs.locale, dictionary: prefs.dictionary };
  return { locale: partner.locale, dictionary: getDictionary(partner.locale) };
}
