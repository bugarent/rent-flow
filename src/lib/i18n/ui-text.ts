/** UI copy for en / ka / ru. Every other locale uses English. */
export function uiText(
  locale: string | null | undefined,
  en: string,
  ka: string,
  ru: string,
): string {
  if (locale === "ka") return ka;
  if (locale === "ru") return ru;
  return en;
}

export function uiLocaleTag(locale: string | null | undefined): string {
  if (locale === "ka") return "ka-GE";
  if (locale === "ru") return "ru-RU";
  if (locale && /^[a-z]{2}$/.test(locale)) return locale;
  return "en-GB";
}
