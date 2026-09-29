import type { Locale } from "@/lib/i18n/config";

type PageKey =
  | "home"
  | "cars"
  | "about"
  | "contact"
  | "locations"
  | "partnership"
  | "becomePartner"
  | "terms"
  | "privacy"
  | "register"
  | "help";

type PageCopy = { title: string; description: string; keywords?: string[] };

const EN: Record<PageKey, PageCopy> = {
  home: {
    title: "Kutaisi Airport Car Rental (KUT) | Georgia Airport Hire | RentAirportCars",
    description:
      "Rent a car at Kutaisi International Airport (KUT), Tbilisi (TBS) and Batumi (BUS). Compare verified local partners, transparent rates with TPL included, and airport delivery timed to your flight.",
    keywords: [
      "Kutaisi airport car rental",
      "KUT car hire",
      "Georgia car rental",
      "Tbilisi airport rental",
      "Batumi airport car hire",
    ],
  },
  cars: {
    title: "Search Airport Cars in Georgia | Kutaisi, Tbilisi, Batumi | RentAirportCars",
    description:
      "Browse available cars near Kutaisi International Airport and other Georgian airports. Filter by category, dates and price — book online with a small deposit.",
  },
  about: {
    title: "About RentAirportCars | Airport Car Rental in Georgia",
    description:
      "Learn how RentAirportCars connects travellers with verified partners for airport car rental in Kutaisi, Tbilisi, Batumi and expanding destinations worldwide.",
  },
  contact: {
    title: "Contact RentAirportCars | Airport Car Rental Support",
    description:
      "Contact RentAirportCars for booking help, partner questions or support with your airport car rental in Georgia and beyond.",
  },
  locations: {
    title: "Car Rental Locations | Kutaisi, Tbilisi, Batumi Airports",
    description:
      "Find activated car rental locations including Kutaisi International Airport (KUT), Tbilisi and Batumi — and more airports as we expand.",
  },
  partnership: {
    title: "Business Partnership | Airport Car Rental Affiliates | Georgia",
    description:
      "Partner with RentAirportCars for hotels, travel agencies and B2B referral programmes at Georgian airports including Kutaisi.",
  },
  becomePartner: {
    title: "Become a Fleet Partner | List Cars at Georgian Airports",
    description:
      "Join RentAirportCars as a verified fleet partner. List your cars for Kutaisi, Tbilisi and Batumi airport pickups after admin approval.",
  },
  terms: {
    title: "Terms of Service | RentAirportCars",
    description: "Read the terms of service for booking airport car rental on RentAirportCars.com.",
  },
  privacy: {
    title: "Privacy Policy | RentAirportCars",
    description: "How RentAirportCars collects, uses and protects your personal data.",
  },
  register: {
    title: "Create Account | RentAirportCars",
    description: "Create a RentAirportCars account to manage airport car rental bookings.",
  },
  help: {
    title: "Help Center | Airport Car Rental FAQ | RentAirportCars",
    description:
      "Answers about booking, payments, airport delivery and cancellations for car rental at Kutaisi and other airports.",
  },
};

const KA: Record<PageKey, PageCopy> = {
  home: {
    title: "ქუთაისის აეროპორტის მანქანის გაქირავება (KUT) | RentAirportCars",
    description:
      "იქირავეთ მანქანა ქუთაისის საერთაშორისო აეროპორტში (KUT), თბილისსა და ბათუმში. გადაამოწმებული პარტნიორები, გამჭვირვალე ფასები და მიწოდება აეროპორტში.",
  },
  cars: {
    title: "მანქანების ძებნა აეროპორტებში | ქუთაისი, თბილისი, ბათუმი",
    description:
      "იპოვეთ ხელმისაწვდომი მანქანები ქუთაისის აეროპორტთან და სხვა ქართულ აეროპორტებთან. გაფილტრეთ კატეგორიით, თარიღებითა და ფასით.",
  },
  about: {
    title: "ჩვენს შესახებ | RentAirportCars",
    description:
      "გაიგეთ, როგორ აკავშირებს RentAirportCars მოგზაურებს გადაამოწმებულ პარტნიორებთან ქუთაისში, თბილისსა და ბათუმში.",
  },
  contact: {
    title: "კონტაქტი | RentAirportCars",
    description: "დაგვიკავშირდით ჯავშნის, პარტნიორობის ან მხარდაჭერის საკითხებზე.",
  },
  locations: {
    title: "გაქირავების ლოკაციები | ქუთაისი, თბილისი, ბათუმი",
    description: "იპოვეთ გააქტიურებული ლოკაციები ქუთაისის, თბილისისა და ბათუმის აეროპორტებში.",
  },
  partnership: {
    title: "ბიზნეს პარტნიორობა | RentAirportCars",
    description: "ითანამშრომლეთ RentAirportCars-თან სასტუმროებისა და სააგენტოებისთვის საქართველოს აეროპორტებში.",
  },
  becomePartner: {
    title: "გახდი პარტნიორი | ავტოპარკის განთავსება",
    description: "განათავსეთ ავტოპარკი ქუთაისის, თბილისისა და ბათუმის აეროპორტებზე.",
  },
  terms: {
    title: "მომსახურების პირობები | RentAirportCars",
    description: "წაიკითხეთ RentAirportCars-ის მომსახურების პირობები.",
  },
  privacy: {
    title: "კონფიდენციალურობის პოლიტიკა | RentAirportCars",
    description: "როგორ ვამუშავებთ და ვიცავთ თქვენს პერსონალურ მონაცემებს.",
  },
  register: {
    title: "რეგისტრაცია | RentAirportCars",
    description: "შექმენით ანგარიში ჯავშნების სამართავად.",
  },
  help: {
    title: "დახმარების ცენტრი | RentAirportCars",
    description: "პასუხები ჯავშნაზე, გადახდაზე და აეროპორტის მიწოდებაზე.",
  },
};

const RU: Record<PageKey, PageCopy> = {
  home: {
    title: "Аренда авто в аэропорту Кутаиси (KUT) | Грузия | RentAirportCars",
    description:
      "Арендуйте авто в аэропорту Кутаиси (KUT), Тбилиси и Батуми. Проверенные партнёры, прозрачные цены и подача в аэропорту.",
  },
  cars: {
    title: "Поиск авто в аэропортах Грузии | Кутаиси, Тбилиси, Батуми",
    description: "Сравните доступные авто возле аэропорта Кутаиси и других аэропортов Грузии.",
  },
  about: {
    title: "О нас | RentAirportCars",
    description: "Как RentAirportCars связывает путешественников с партнёрами в Кутаиси, Тбилиси и Батуми.",
  },
  contact: {
    title: "Контакты | RentAirportCars",
    description: "Свяжитесь с нами по бронированию, партнёрству или поддержке.",
  },
  locations: {
    title: "Локации аренды | Кутаиси, Тбилиси, Батуми",
    description: "Активные локации аренды авто в аэропортах Грузии.",
  },
  partnership: {
    title: "Бизнес-партнёрство | RentAirportCars",
    description: "Партнёрская программа для отелей и агентств в аэропортах Грузии.",
  },
  becomePartner: {
    title: "Стать партнёром | Размещение автопарка",
    description: "Разместите автопарк для выдачи в аэропортах Кутаиси, Тбилиси и Батуми.",
  },
  terms: {
    title: "Условия использования | RentAirportCars",
    description: "Условия бронирования аренды авто на RentAirportCars.com.",
  },
  privacy: {
    title: "Политика конфиденциальности | RentAirportCars",
    description: "Как мы обрабатываем и защищаем ваши персональные данные.",
  },
  register: {
    title: "Регистрация | RentAirportCars",
    description: "Создайте аккаунт для управления бронированиями.",
  },
  help: {
    title: "Справка | RentAirportCars",
    description: "Ответы о бронировании, оплате и подаче в аэропорту.",
  },
};

function pack(locale: Locale): Record<PageKey, PageCopy> {
  if (locale === "ka") return KA;
  if (locale === "ru") return RU;
  return EN;
}

export function getPageSeo(page: PageKey, locale: Locale = "en"): PageCopy {
  return pack(locale)[page] ?? EN[page];
}

export function carDetailSeo(input: {
  make: string;
  model: string;
  year?: number;
  airportLabel?: string;
  locale?: Locale;
}): PageCopy {
  const year = input.year ? ` ${input.year}` : "";
  const airport = input.airportLabel?.trim() || "Kutaisi Airport";
  const locale = input.locale || "en";
  if (locale === "ka") {
    return {
      title: `${input.make} ${input.model}${year} — გაქირავება ${airport} | RentAirportCars`,
      description: `იქირავეთ ${input.make} ${input.model}${year} ${airport}-თან. ონლაინ ჯავშანი, აეროპორტის მიწოდება და გამჭვირვალე ფასი.`,
    };
  }
  if (locale === "ru") {
    return {
      title: `${input.make} ${input.model}${year} — аренда у ${airport} | RentAirportCars`,
      description: `Арендуйте ${input.make} ${input.model}${year} возле ${airport}. Онлайн-бронирование и подача в аэропорту.`,
    };
  }
  return {
    title: `${input.make} ${input.model}${year} — Rent near ${airport} | RentAirportCars`,
    description: `Book the ${input.make} ${input.model}${year} for airport pickup near ${airport}. Transparent rates, TPL included, and verified partners on RentAirportCars.`,
  };
}
