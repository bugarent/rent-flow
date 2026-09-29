import "server-only";

import type { Locale } from "@/lib/i18n/config";
import { getHelpCenterConfig } from "@/lib/server/help-center-store";
import { isOperatorHours, operatorHoursLabel } from "@/lib/server/live-chat/operator-hours";

export type LiveChatAiResult = {
  reply: string;
  exhausted: boolean;
  userWantsOperator: boolean;
};

const MAX_REPLY_CHARS = 280;

function clip(text: string, max = MAX_REPLY_CHARS): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return norm(s)
    .split(" ")
    .filter((t) => t.length >= 3);
}

function scoreOverlap(query: string, text: string): number {
  const q = new Set(tokens(query));
  if (!q.size) return 0;
  let hit = 0;
  for (const w of tokens(text)) if (q.has(w)) hit += 1;
  return hit;
}

function wantsOperator(message: string): boolean {
  return /ოპერატორ|ცოცხალ|ადამიან|operator|human|agent|менеджер|оператор|живой/i.test(message);
}

function rentalIntent(message: string): boolean {
  return /მანქან|დაქირავ|გაქირავ|rent|car|hire|авто|аренд/i.test(message);
}

function priceIntent(message: string): boolean {
  return /ფას|ღირებულ|თანხა|price|cost|€|eur|ლარი|депозит|deposit|ავანს/i.test(message);
}

function deliveryIntent(message: string): boolean {
  return /აეროპორტ|მიწოდ|delivery|airport|pickup|აღება|ტერმინალ|TBS|ტბილის/i.test(message);
}

function bookingIntent(message: string): boolean {
  return /ჯავშნ|დაჯავშნ|booking|reserve|заказ|брон/i.test(message);
}

function shortCopy(
  locale: string,
  key: "rent" | "price" | "delivery" | "help" | "faqFallback",
): string {
  const ka = {
    rent: "მთავარ გვერდზე აირჩიეთ აეროპორტი და თარიღები, მოძებნეთ მანქანა და დააჯავშნეთ ონლაინ. მიწოდება აეროპორტში ხელმისაწვდომია.",
    price: "ფასი ჩანს ძებნაში (€/დღე). ნაწილი იხდის ონლაინ, დანარჩენი — აღებისას.",
    delivery: "აეროპორტში აღება/მიწოდება ხელმისაწვდომია. ძებნაში აირჩიეთ სასურველი აეროპორტი.",
    help: "რით დაგეხმაროთ — ძებნა, ფასი თუ აეროპორტის მიწოდება? მოკლედ მკითხეთ.",
    faqFallback: "დეტალები Help-შია. თუ გინდათ, მოკლედ გადმოგცემთ ან ოპერატორს დაგაკავშირებთ.",
  };
  const ru = {
    rent: "На главной выберите аэропорт и даты, найдите авто и забронируйте онлайн. Доставка в аэропорт доступна.",
    price: "Цена видна в поиске (€/день). Часть — онлайн, остаток при получении.",
    delivery: "Получение/доставка в аэропорту доступны. Выберите аэропорт в поиске.",
    help: "Чем помочь — поиск, цена или доставка в аэропорт? Спросите коротко.",
    faqFallback: "Подробности в Help. Могу кратко ответить или связать с оператором.",
  };
  const en = {
    rent: "On the homepage pick airport and dates, search a car, and book online. Airport delivery is available.",
    price: "Daily price (€) shows in search. Part is paid online; the rest at pickup.",
    delivery: "Airport pickup/delivery is available. Choose your airport in search.",
    help: "How can I help — search, price, or airport delivery? Ask briefly.",
    faqFallback: "Details are in Help. I can keep it short or connect you to an operator.",
  };
  const pack = locale === "ka" ? ka : locale === "ru" ? ru : en;
  return pack[key];
}

/** Short answers from site data when OpenAI is unavailable. */
export async function answerFromSiteKnowledge(input: {
  locale: Locale | string;
  message: string;
}): Promise<LiveChatAiResult> {
  const locale = input.locale === "ka" || input.locale === "ru" ? input.locale : "en";
  const msg = input.message.trim();
  const operatorAsk = wantsOperator(msg);

  const help = await getHelpCenterConfig().catch(() => null);

  let bestFaq: { a: string; score: number } | null = null;
  if (help) {
    for (const cat of help.categories) {
      for (const topic of cat.topics) {
        for (const article of topic.articles) {
          const score =
            scoreOverlap(msg, `${article.question} ${article.answer}`) * 2 +
            scoreOverlap(msg, article.question) * 3;
          if (score > 0 && (!bestFaq || score > bestFaq.score)) {
            bestFaq = { a: article.answer, score };
          }
        }
      }
    }
  }

  let reply: string;
  if (bestFaq && bestFaq.score >= 2) {
    reply = clip(bestFaq.a, MAX_REPLY_CHARS);
  } else if (rentalIntent(msg) || bookingIntent(msg)) {
    reply = shortCopy(locale, "rent");
  } else if (priceIntent(msg)) {
    reply = shortCopy(locale, "price");
  } else if (deliveryIntent(msg)) {
    reply = shortCopy(locale, "delivery");
  } else {
    reply = shortCopy(locale, "help");
  }

  if (operatorAsk) {
    const open = isOperatorHours();
    const op =
      locale === "ka"
        ? open
          ? "ოპერატორთან დასაკავშირებლად დააჭირეთ ღილაკს."
          : `ოპერატორი: ${operatorHoursLabel()}.`
        : open
          ? "Tap Connect to operator."
          : `Operator hours: ${operatorHoursLabel()}.`;
    reply = clip(`${reply} ${op}`, MAX_REPLY_CHARS + 40);
  }

  const exhausted =
    !(bestFaq && bestFaq.score >= 2) &&
    !rentalIntent(msg) &&
    !priceIntent(msg) &&
    !deliveryIntent(msg) &&
    !bookingIntent(msg);

  return {
    reply,
    exhausted: exhausted || (operatorAsk && !isOperatorHours()),
    userWantsOperator: operatorAsk,
  };
}
