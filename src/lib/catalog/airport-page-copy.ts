import type { Locale } from "@/lib/i18n/config";

type AirportPageCopy = { home: string; cta: string; related: string; empty: string };

const COPY: Record<Locale, AirportPageCopy> = {
  en: { home: "Home", cta: "See available cars", related: "Other airports and places", empty: "Information has not been added yet." },
  ka: { home: "მთავარი", cta: "ხელმისაწვდომი მანქანების ნახვა", related: "სხვა აეროპორტები და ადგილები", empty: "ინფორმაცია ჯერ არ არის დამატებული." },
  ru: { home: "Главная", cta: "Смотреть доступные авто", related: "Другие аэропорты и места", empty: "Информация ещё не добавлена." },
  de: { home: "Startseite", cta: "Verfügbare Autos ansehen", related: "Weitere Flughäfen und Orte", empty: "Noch keine Informationen vorhanden." },
  es: { home: "Inicio", cta: "Ver coches disponibles", related: "Otros aeropuertos y lugares", empty: "Aún no se ha añadido información." },
  fr: { home: "Accueil", cta: "Voir les voitures disponibles", related: "Autres aéroports et lieux", empty: "Aucune information pour le moment." },
  it: { home: "Home", cta: "Vedi le auto disponibili", related: "Altri aeroporti e luoghi", empty: "Nessuna informazione ancora." },
  nl: { home: "Home", cta: "Beschikbare auto's bekijken", related: "Andere luchthavens en plaatsen", empty: "Nog geen informatie toegevoegd." },
  pl: { home: "Strona główna", cta: "Zobacz dostępne auta", related: "Inne lotniska i miejsca", empty: "Informacje nie zostały jeszcze dodane." },
  tr: { home: "Ana sayfa", cta: "Müsait araçları gör", related: "Diğer havalimanları ve yerler", empty: "Henüz bilgi eklenmedi." },
  ar: { home: "الرئيسية", cta: "عرض السيارات المتاحة", related: "مطارات وأماكن أخرى", empty: "لم تتم إضافة معلومات بعد." },
  zh: { home: "首页", cta: "查看可用车辆", related: "其他机场和地点", empty: "暂无信息。" },
  ko: { home: "홈", cta: "이용 가능한 차량 보기", related: "다른 공항 및 장소", empty: "아직 정보가 없습니다." },
  th: { home: "หน้าแรก", cta: "ดูรถที่ว่าง", related: "สนามบินและสถานที่อื่นๆ", empty: "ยังไม่มีข้อมูล" },
};

export function airportPageCopy(locale: string): AirportPageCopy {
  return COPY[locale as Locale] ?? COPY.en;
}
