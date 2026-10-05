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

export type AdminBackTarget = "partners" | "profiles" | "listings" | "primary" | "moderation";

export function adminBackLabel(locale: string | null | undefined, target: AdminBackTarget): string {
  if (target === "partners") return uiText(locale, "← Partners", "← პარტნიორები", "← Партнёры");
  if (target === "profiles") return uiText(locale, "← Profiles", "← პროფილები", "← Профили");
  if (target === "listings") return uiText(locale, "← Listings", "← განცხადებები", "← Объявления");
  if (target === "primary") {
    return uiText(locale, "← Primary moderation", "← პირველადი მოდერაცია", "← Первичная модерация");
  }
  return uiText(locale, "← Moderation", "← მოდერაცია", "← Модерация");
}

export function uiLocaleTag(locale: string | null | undefined): string {
  if (locale === "ka") return "ka-GE";
  if (locale === "ru") return "ru-RU";
  if (locale && /^[a-z]{2}$/.test(locale)) return locale;
  return "en-GB";
}
