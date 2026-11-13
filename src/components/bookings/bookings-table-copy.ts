export type BookingsTableCopy = {
  title: string;
  search: string;
  filters: string;
  all: string;
  paid: string;
  current: string;
  completed: string;
  cancelled: string;
  empty: string;
  colCar: string;
  colDriver: string;
  colFrom: string;
  colTo: string;
  colPrice: string;
  colTotal: string;
  colDueAtPickup: string;
  colStatus: string;
  businessPartnerCode: string;
  noRows: string;
  view: string;
};

const COPY: Record<string, BookingsTableCopy> = {
  en: {
    title: "Bookings",
    search: "Search…",
    filters: "Filters",
    all: "All",
    paid: "Active",
    current: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
    empty: "Partner cancelled",
    colCar: "Car",
    colDriver: "Driver",
    colFrom: "From",
    colTo: "To",
    colPrice: "Price",
    colTotal: "Total price",
    colDueAtPickup: "Due at pick-up",
    colStatus: "Status",
    businessPartnerCode: "Business partner code",
    noRows: "No bookings found.",
    view: "View",
  },
  ka: {
    title: "ჯავშნები",
    search: "ძებნა...",
    filters: "ფილტრები",
    all: "ყველა",
    paid: "აქტიური",
    current: "მიმდინარე",
    completed: "დასრულებული",
    cancelled: "გაუქმებული",
    empty: "პარტნიორის გაუქმებული",
    colCar: "მანქანა",
    colDriver: "მძღოლი",
    colFrom: "დან",
    colTo: "მდე",
    colPrice: "ფასი",
    colTotal: "ჯამური ფასი",
    colDueAtPickup: "აღებისას გადასახდელი",
    colStatus: "სტატუსი",
    businessPartnerCode: "ბიზნეს პარტნიორის კოდი",
    noRows: "ჯავშნები არ მოიძებნა.",
    view: "ნახვა",
  },
  ru: {
    title: "Брони",
    search: "Поиск…",
    filters: "Фильтры",
    all: "Все",
    paid: "Активные",
    current: "Текущая",
    completed: "Завершено",
    cancelled: "Отменено",
    empty: "Отменено партнёром",
    colCar: "Авто",
    colDriver: "Водитель",
    colFrom: "С",
    colTo: "По",
    colPrice: "Цена",
    colTotal: "Итого",
    colDueAtPickup: "При получении",
    colStatus: "Статус",
    businessPartnerCode: "Код бизнес-партнёра",
    noRows: "Брони не найдены.",
    view: "Смотреть",
  },
  fr: {
    title: "Réservations",
    search: "Rechercher…",
    filters: "Filtres",
    all: "Tous",
    paid: "Actives",
    current: "En cours",
    completed: "Terminée",
    cancelled: "Annulé",
    empty: "Annulé par le partenaire",
    colCar: "Voiture",
    colDriver: "Conducteur",
    colFrom: "Du",
    colTo: "Au",
    colPrice: "Prix",
    colTotal: "Prix total",
    colDueAtPickup: "À la prise en charge",
    colStatus: "Statut",
    businessPartnerCode: "Code partenaire",
    noRows: "Aucune réservation.",
    view: "Voir",
  },
  de: {
    title: "Buchungen",
    search: "Suchen…",
    filters: "Filter",
    all: "Alle",
    paid: "Aktiv",
    current: "Laufend",
    completed: "Abgeschlossen",
    cancelled: "Storniert",
    empty: "Vom Partner storniert",
    colCar: "Auto",
    colDriver: "Fahrer",
    colFrom: "Von",
    colTo: "Bis",
    colPrice: "Preis",
    colTotal: "Gesamtpreis",
    colDueAtPickup: "Bei Abholung",
    colStatus: "Status",
    businessPartnerCode: "Partnercode",
    noRows: "Keine Buchungen.",
    view: "Ansehen",
  },
  pl: {
    title: "Rezerwacje",
    search: "Szukaj…",
    filters: "Filtry",
    all: "Wszystkie",
    paid: "Aktywne",
    current: "W trakcie",
    completed: "Zakończone",
    cancelled: "Anulowane",
    empty: "Anulowane przez partnera",
    colCar: "Auto",
    colDriver: "Kierowca",
    colFrom: "Od",
    colTo: "Do",
    colPrice: "Cena",
    colTotal: "Cena łączna",
    colDueAtPickup: "Przy odbiorze",
    colStatus: "Status",
    businessPartnerCode: "Kod partnera",
    noRows: "Brak rezerwacji.",
    view: "Zobacz",
  },
  ar: {
    title: "الحجوزات",
    search: "بحث…",
    filters: "تصفية",
    all: "الكل",
    paid: "نشط",
    current: "جارية",
    completed: "مكتمل",
    cancelled: "ملغى",
    empty: "ملغى من الشريك",
    colCar: "السيارة",
    colDriver: "السائق",
    colFrom: "من",
    colTo: "إلى",
    colPrice: "السعر",
    colTotal: "السعر الإجمالي",
    colDueAtPickup: "عند الاستلام",
    colStatus: "الحالة",
    businessPartnerCode: "رمز الشريك",
    noRows: "لا توجد حجوزات.",
    view: "عرض",
  },
};

export function getBookingsTableCopy(locale: string): BookingsTableCopy {
  return COPY[locale] || COPY.en;
}
