import type { Locale } from "@/lib/i18n/config";
import { CountryFlag } from "@/components/ui/country-flag";
import { cn } from "@/lib/utils";

/** ISO2 flag used next to each UI language. */
export const LOCALE_FLAG_ISO2: Record<Locale, string> = {
  en: "GB",
  ka: "GE",
  de: "DE",
  es: "ES",
  fr: "FR",
  it: "IT",
  nl: "NL",
  pl: "PL",
  tr: "TR",
  ru: "RU",
  ar: "SA",
  zh: "CN",
  ko: "KR",
  th: "TH",
};

export function LocaleFlag({
  locale,
  className = "h-[14px] w-[20px]",
}: {
  locale: Locale;
  className?: string;
}) {
  return (
    <CountryFlag
      iso2={LOCALE_FLAG_ISO2[locale]}
      className={cn("h-[14px] w-[20px] rounded-[2px]", className)}
    />
  );
}
