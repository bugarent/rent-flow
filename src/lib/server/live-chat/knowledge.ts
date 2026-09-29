import "server-only";

import { SITE_NAME } from "@/lib/brand";
import { getHelpCenterConfig } from "@/lib/server/help-center-store";
import { getHomepageCategories, getHomepageAirports } from "@/lib/server/homepage";
import { getSearchDeliveryAirports } from "@/lib/server/delivery-locations";
import { loadPublicFileSearchCars } from "@/lib/server/public-file-cars";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { OPERATOR_HOUR_END, OPERATOR_HOUR_START, OPERATOR_TZ } from "@/lib/server/live-chat/operator-hours";

type CacheEntry = { at: number; value: string };
const cacheByLocale = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

/** Compact site knowledge for the AI system prompt. */
export async function buildLiveChatKnowledge(locale: Locale = "en"): Promise<string> {
  const key = locale;
  const hit = cacheByLocale.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const dictionary = getDictionary(locale);
  const [help, categories, airports, delivery, cars] = await Promise.all([
    getHelpCenterConfig().catch(() => null),
    getHomepageCategories().catch(() => []),
    getHomepageAirports().catch(() => []),
    getSearchDeliveryAirports().catch(() => []),
    loadPublicFileSearchCars().catch(() => []),
  ]);

  const faqLines: string[] = [];
  if (help) {
    for (const cat of help.categories.slice(0, 8)) {
      for (const topic of cat.topics.slice(0, 6)) {
        for (const article of topic.articles.slice(0, 4)) {
          faqLines.push(`Q: ${article.question}\nA: ${article.answer.slice(0, 500)}`);
        }
      }
    }
  }

  const categoryLines = categories
    .slice(0, 12)
    .map((c) => `- ${c.name}: ${c.details.slice(0, 160)}`);
  const airportLines = airports.slice(0, 12).map((a) => `- ${a.title} (${a.iata})`);
  const deliveryLines = delivery
    .slice(0, 40)
    .map((d) => `- ${d.label} [${d.iata}]${d.individualBookingEnabled ? " (individual booking)" : ""}`);

  const carLines = cars.slice(0, 60).map((c) => {
    const rate = Number(c.dailyRateEur) > 0 ? ` from €${Number(c.dailyRateEur).toFixed(0)}/day` : "";
    return `- ${c.make} ${c.model} ${c.year}${rate}; ${c.transmission}/${c.fuelType}; ${c.seats} seats; category=${c.categorySlug || "—"}`;
  });

  const text = [
    `Site: ${SITE_NAME}`,
    `Tagline: ${dictionary.common.footerTagline}`,
    `Operator live chat (Asia/Tbilisi): ${String(OPERATOR_HOUR_START).padStart(2, "0")}:00–${String(OPERATOR_HOUR_END).padStart(2, "0")}:00 ${OPERATOR_TZ}`,
    "Airport delivery / pickup is the core product.",
    "",
    "About:",
    dictionary.common.aboutParagraphs.join("\n"),
    "",
    "Terms summary:",
    dictionary.common.termsBody,
    "",
    "Privacy summary:",
    dictionary.common.privacyBody,
    "",
    "Vehicle categories:",
    categoryLines.join("\n") || "(none listed)",
    "",
    "Sample published fleet (rates may change; confirm on search):",
    carLines.join("\n") || "(no published cars)",
    "",
    "Popular airports:",
    airportLines.join("\n") || "(none listed)",
    "",
    "Active delivery / pickup locations:",
    deliveryLines.join("\n") || "(none listed)",
    "",
    "Help center Q&A:",
    faqLines.slice(0, 40).join("\n\n") || "(no articles)",
  ].join("\n");

  cacheByLocale.set(key, { at: Date.now(), value: text });
  return text;
}
