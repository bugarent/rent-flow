import "server-only";

import type { Locale } from "@/lib/i18n/config";
import { getHelpCenterConfig } from "@/lib/server/help-center-store";
import { isOperatorHours, operatorHoursLabel } from "@/lib/server/live-chat/operator-hours";

export type LiveChatAiResult = {
  reply: string;
  exhausted: boolean;
  userWantsOperator: boolean;
};

const MAX_REPLY_CHARS = 700;

function clip(text: string, max = MAX_REPLY_CHARS): string {
  const t = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
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

function clarifyCopy(locale: string): string {
  if (locale === "ka") {
    return "რომ ზუსტად გიპასუხოთ, დამიზუსტეთ: რომელი აეროპორტი/ქალაქი, რა თარიღები და რა ტიპის მანქანა გაინტერესებთ? თუ პარტნიორი ხართ — რომელ საკითხს ეხება კითხვა (განცხადება, დაზღვევა, ჯავშანი, ანგარიშსწორება)?";
  }
  if (locale === "ru") {
    return "Чтобы ответить точно, уточните: какой аэропорт/город, какие даты и какой тип авто вас интересует? Если вы партнёр — к чему относится вопрос (объявление, страховка, бронь, расчёты)?";
  }
  return "To answer precisely, could you clarify: which airport/city, which dates and what type of car? If you are a partner — which topic is it about (listing, insurance, booking, payouts)?";
}

function sameText(a: string, b: string) {
  return norm(a) === norm(b);
}

function wasSaid(text: string, previous: string[]) {
  const head = norm(clip(text, 160));
  if (!head) return false;
  return previous.some((p) => sameText(p, text) || norm(p).includes(head));
}

function isMultiPart(message: string): boolean {
  const questions = (message.match(/\?/g) || []).length;
  return questions >= 2 || /\n\s*(\d+[.)]|[-•])/.test(message);
}

/** Answers from site data when OpenAI is unavailable; avoids repeating earlier replies. */
export async function answerFromSiteKnowledge(input: {
  locale: Locale | string;
  message: string;
  previousReplies?: string[];
}): Promise<LiveChatAiResult> {
  const locale = input.locale === "ka" || input.locale === "ru" ? input.locale : "en";
  const msg = input.message.trim();
  const previous = input.previousReplies ?? [];
  const operatorAsk = wantsOperator(msg);

  const help = await getHelpCenterConfig().catch(() => null);

  const ranked: Array<{ q: string; a: string; score: number }> = [];
  if (help) {
    for (const cat of help.categories) {
      for (const topic of cat.topics) {
        for (const article of topic.articles) {
          const score =
            scoreOverlap(msg, `${article.question} ${article.answer}`) * 2 +
            scoreOverlap(msg, article.question) * 3;
          if (score >= 2) ranked.push({ q: article.question, a: article.answer, score });
        }
      }
    }
  }
  ranked.sort((x, y) => y.score - x.score);
  const fresh = ranked.filter((r) => !wasSaid(r.a, previous));
  const bestFaq = fresh[0] ?? null;

  let reply: string;
  if (bestFaq && isMultiPart(msg) && fresh.length > 1) {
    reply = fresh
      .slice(0, 3)
      .map((r, i) => `${i + 1}. ${r.q}\n${clip(r.a, 320)}`)
      .join("\n\n");
  } else if (bestFaq) {
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
  if (wasSaid(reply, previous)) reply = clarifyCopy(locale);

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
    !bestFaq &&
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
