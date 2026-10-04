import { effectiveOneWayDeliveryPrice } from "@/lib/delivery/pricing";
import { CATALOG_AIRPORTS } from "@/lib/catalog/airports";
import { composeLocationAddress } from "@/lib/catalog/search-places";
import { PARTNER_SOCIAL_PLATFORMS, type PartnerSocialPlatform } from "@/lib/partner";
import { roundMoney } from "@/lib/cars/reserve-pricing";
import { utcToAirportLocalInput } from "@/lib/datetime/airport-timezone";
import type { BookingInfoLocationOption, Copy } from "./types";

export function daysBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 1;
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function transmissionLabel(value: string | undefined, locale: string) {
  const raw = String(value || "").toUpperCase();
  if (!raw) return "";
  const isManual = raw.includes("MANUAL");
  if (locale === "ka") return isManual ? "მექანიკა" : "ავტომატი";
  if (locale === "ru") return isManual ? "Механика" : "Автомат";
  return isManual ? "Manual" : "Automatic";
}

export function fuelLabel(value: string | undefined, locale: string) {
  const raw = String(value || "").toUpperCase();
  if (!raw) return "";
  const map: Record<string, { ka: string; ru: string; en: string }> = {
    PETROL: { ka: "ბენზინი", ru: "Бензин", en: "Petrol" },
    DIESEL: { ka: "დიზელი", ru: "Дизель", en: "Diesel" },
    HYBRID: { ka: "ჰიბრიდი", ru: "Гибрид", en: "Hybrid" },
    ELECTRIC: { ka: "ელექტრო", ru: "Электро", en: "Electric" },
    GAS: { ka: "გაზი", ru: "Газ", en: "Gas" },
  };
  const hit = map[raw];
  if (!hit) return value || "";
  if (locale === "ka") return hit.ka;
  if (locale === "ru") return hit.ru;
  return hit.en;
}

export function formatBirthDate(iso: string, locale: string) {
  const raw = iso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  try {
    return new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : locale === "ru" ? "ru-RU" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${raw}T12:00:00`));
  } catch {
    return raw;
  }
}

/** Full years as of the pick-up date, or today when that date is missing. */
export function ageInYears(dob: string, asOfIso?: string): number | null {
  const raw = dob.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const birth = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const asOfRaw = (asOfIso || "").trim().slice(0, 10);
  const asOf = /^\d{4}-\d{2}-\d{2}$/.test(asOfRaw) ? new Date(`${asOfRaw}T12:00:00`) : new Date();
  if (Number.isNaN(asOf.getTime()) || birth > asOf) return null;
  let age = asOf.getFullYear() - birth.getFullYear();
  const monthDiff = asOf.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < birth.getDate())) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

export function formatWhen(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : locale === "ru" ? "ru-RU" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatPlaceLabel(opts: {
  address?: string;
  name?: string;
  city?: string;
  iata?: string;
}) {
  const address = String(opts.address || "").trim();
  const name = String(opts.name || "").trim();
  const iata = String(opts.iata || "").trim().toUpperCase();
  const city = cityNameForPlace(String(opts.city || "").trim(), iata);
  if (address) {
    if (addressIncludesCity(address, city, iata)) return address;
    return composeLocationAddress(city, address);
  }
  if (name && name.toUpperCase() !== iata) return name;
  if (city && city.toUpperCase() !== iata) {
    return iata ? `${city} (${iata})` : city;
  }
  return iata || "—";
}

function cityNameForPlace(city: string, iata: string) {
  const airport = CATALOG_AIRPORTS.find((item) => item.iata.toUpperCase() === iata);
  if (!airport) return city;
  const names = Object.values(airport.cityName).filter(
    (value): value is string => typeof value === "string" && value.trim().length > 1,
  );
  const given = city.trim();
  if (names.some((name) => name.trim().toLocaleLowerCase() === given.toLocaleLowerCase())) return given;
  return airport.cityName.en || given;
}

function addressIncludesCity(address: string, city: string, iata: string) {
  const hay = address.toLocaleLowerCase();
  const names = [city];
  const airport = CATALOG_AIRPORTS.find((item) => item.iata.toUpperCase() === iata);
  if (airport) {
    for (const value of Object.values(airport.cityName)) {
      if (typeof value === "string") names.push(value);
    }
  }
  return names.some((item) => {
    const name = item.trim().toLocaleLowerCase();
    return name.length > 1 && hay.includes(name);
  });
}

export function statusLabel(status: string, t: Copy, ended = false) {
  if (ended && (status === "CONFIRMED" || status === "COMPLETED" || status === "PENDING")) return t.completed;
  if (status === "CONFIRMED" || status === "COMPLETED" || status === "PENDING") return t.paid;
  if (status === "CANCELLED") return t.cancelled;
  if (status === "UNFULFILLED") return t.partnerCancelled;
  return t.pending;
}

export function languageLabel(code: string, locale: string) {
  const map: Record<string, Record<string, string>> = {
    en: { en: "English", ka: "Georgian", ru: "Russian", fr: "French", de: "German", pl: "Polish", ar: "Arabic" },
    ka: { en: "ინგლისური", ka: "ქართული", ru: "რუსული", fr: "ფრანგული", de: "გერმანული", pl: "პოლონური", ar: "არაბული" },
    ru: { en: "Английский", ka: "Грузинский", ru: "Русский", fr: "Французский", de: "Немецкий", pl: "Польский", ar: "Арабский" },
  };
  const key = code.toLowerCase();
  const known = (map[locale] || map.en)[key];
  if (known) return known;
  try {
    const name = new Intl.DisplayNames([locale, "en"], { type: "language" }).of(key);
    if (name && name.toLowerCase() !== key) return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
  } catch {
    /* unsupported locale/code */
  }
  return code.toUpperCase();
}

export function normalizeSocial(raw: string[]): PartnerSocialPlatform[] {
  const allowed = new Set(PARTNER_SOCIAL_PLATFORMS.map((p) => p.value));
  const out: PartnerSocialPlatform[] = [];
  for (const item of raw) {
    const v = String(item || "").toUpperCase() as PartnerSocialPlatform;
    if (allowed.has(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

export function socialLabel(platform: PartnerSocialPlatform, locale: string) {
  if (locale === "ka") {
    if (platform === "WHATSAPP") return "ვაცაპი";
    if (platform === "VIBER") return "ვიბერი";
    return "ტელეგრამი";
  }
  if (locale === "ru") {
    if (platform === "WHATSAPP") return "WhatsApp";
    if (platform === "VIBER") return "Viber";
    return "Telegram";
  }
  if (platform === "WHATSAPP") return "WhatsApp";
  if (platform === "VIBER") return "Viber";
  return "Telegram";
}

export function toLocalInput(iso: string, timeZone?: string) {
  if (timeZone) {
    return utcToAirportLocalInput(iso, timeZone);
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "10:00" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes() < 30 ? 0 : 30)}`,
  };
}

export function deliveryPlaceLineLabel(iata: string, label: string) {
  const code = String(iata || "").trim().toUpperCase();
  let name = String(label || "").trim();
  name = name.replace(/\s*[\[(]\s*[A-Z0-9]{3,8}\s*[\])]\s*$/i, "").trim();
  if (!name) name = code || "—";
  if (code && !name.toUpperCase().includes(code)) return `${name} [${code}]`;
  return name;
}

export function legFeeForLocation(
  loc: BookingInfoLocationOption | undefined,
  rentalDays: number,
  fallbackFeeEur = 0,
) {
  if (!loc) return roundMoney(fallbackFeeEur);
  return roundMoney(
    effectiveOneWayDeliveryPrice(
      Number(loc.priceEur) || 0,
      loc.freeAfterDays ?? null,
      rentalDays,
    ),
  );
}

export function formatSignedMoney(n: number) {
  const v = roundMoney(n);
  if (v > 0) return `+€${v.toFixed(2)}`;
  if (v < 0) return `-€${Math.abs(v).toFixed(2)}`;
  return `€0.00`;
}

export function formatSignedDays(n: number) {
  if (n > 0) return `+${n}`;
  if (n < 0) return `${n}`;
  return "0";
}
