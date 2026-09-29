import type { PartnerLocale } from "@/lib/i18n/partner-config";
import { fillPartnerDictionary, partnerDictionaryExtras } from "@/lib/i18n/partner-dictionary-extra";
import {
  partnerUiEn,
  partnerUiKa,
  partnerUiRu,
  type PartnerCommonCopy,
  type PartnerCreateCarCopy,
  type PartnerPersonalInfoCopy,
} from "@/lib/i18n/partner-ui";

export type PartnerDictionary = {
  language: string;
  signOut: string;
  brand: string;
  nav: {
    dashboard: string;
    fleet: string;
    bookings: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    noProfileTitle: string;
    noProfileBody: string;
    becomePartner: string;
    basicInfo: string;
    basicInfoHelp: string;
    company: string;
    phone: string;
    status: string;
    fleet: string;
    vehicles: string;
    operatingTitle: string;
    operatingHelp: string;
    noAirports: string;
    fleetListings: string;
    bookingLog: string;
  };
  fleetPage: {
    title: string;
    bookings: string;
    addCar: string;
    edit: string;
    empty: string;
    addFirst: string;
    perDay: string;
  };
  bookingsPage: {
    title: string;
    customer: string;
    flight: string;
    contact: string;
    messenger: string;
    times: string;
    total: string;
    deposit: string;
    balance: string;
    empty: string;
    dashboardTitle: string;
    businessOverview: string;
    dateFrom: string;
    dateTo: string;
    applyPeriod: string;
    clearPeriod: string;
    noPeriodMatches: string;
    earned: string;
    bookingsTotal: string;
    upcomingBookings: string;
    next7Days: string;
    carsTotal: string;
    fleet: string;
    dailyRevenue: string;
    lastDaysSummary: string;
    days30: string;
    months2: string;
    months3: string;
    months6: string;
    year1: string;
    byStatus: string;
    statusPaid: string;
    statusCancelled: string;
    statusPending: string;
    statusConfirmed: string;
    statusCompleted: string;
    recentBookings: string;
    viewAll: string;
    colId: string;
    colDriver: string;
    colCar: string;
    colBookedAt: string;
    colStart: string;
    colStatus: string;
    colPrice: string;
    colPaidOnSite: string;
    colTotal: string;
    sectionActive: string;
    sectionIncomplete: string;
    sectionCancelled: string;
    sectionActiveOnly: string;
    sectionCompleted: string;
    searchLabel: string;
    searchDigitsPlaceholder: string;
    colEmail: string;
    colFirstName: string;
    colLastName: string;
    colPickup: string;
    colDropoff: string;
    edit: string;
    delete: string;
    save: string;
    cancel: string;
    editTitle: string;
    confirmDelete: string;
    saveFailed: string;
    deleteFailed: string;
    statusUnfulfilled: string;
  };
  telegram: {
    verifiedShort: string;
    verifiedHelp: string;
    unverifiedBanner: string;
    verifyButton: string;
    cardTitle: string;
    cardBody: string;
    openBot: string;
    statusUnavailable: string;
    activateFailed: string;
    activateRequired: string;
  };
  calendar: {
    calendar: string;
    history: string;
    searchPlaceholder: string;
    bookingSearchPlaceholder: string;
    bookingSearchAria: string;
    other: string;
    account: string;
    personalInfo: string;
    delivery: string;
    discounts: string;
    equipmentService: string;
    integration: string;
    allCars: string;
    addCar: string;
    noCars: string;
    loading: string;
    zoomIn: string;
    zoomOut: string;
    close: string;
    pickup: string;
    dropoff: string;
    updated: string;
  };
  common: PartnerCommonCopy;
  personalInfo: PartnerPersonalInfoCopy;
  createCar: PartnerCreateCarCopy;
};

const en: PartnerDictionary = {
  language: "Language",
  signOut: "Sign out",
  brand: "Partner Portal",
  nav: {
    dashboard: "Calendar",
    fleet: "Fleet",
    bookings: "Bookings",
  },
  dashboard: {
    title: "Partner portal",
    subtitle: "Manage your fleet and airport bookings. Listings go live only after admin approval.",
    noProfileTitle: "No partner profile is linked to this account.",
    noProfileBody: "If you are a fleet supplier, submit a partnership application from the public site.",
    becomePartner: "Become a partner",
    basicInfo: "Basic information",
    basicInfoHelp: "Company details and Telegram verification for booking notifications.",
    company: "Company",
    phone: "Phone",
    status: "Status",
    fleet: "Fleet",
    vehicles: "vehicles",
    operatingTitle: "Operating countries & airports",
    operatingHelp: "Approved locations for your account. Enable Delivery for these airports when creating a listing.",
    noAirports: "No airports linked yet. Contact admin or update registration when invited for corrections.",
    fleetListings: "Fleet listings",
    bookingLog: "Booking log",
  },
  fleetPage: {
    title: "My fleet",
    bookings: "Bookings",
    addCar: "Add new car",
    edit: "Edit",
    empty: "You haven't added any cars yet.",
    addFirst: "Add your first car",
    perDay: "/day",
  },
  bookingsPage: {
    title: "Booking log",
    customer: "Customer",
    flight: "Flight",
    contact: "Contact",
    messenger: "Messenger",
    times: "Times",
    total: "Total",
    deposit: "Deposit",
    balance: "Balance due",
    empty: "No bookings yet.",
    dashboardTitle: "Main dashboard",
    businessOverview: "Business overview",
    dateFrom: "From",
    dateTo: "To",
    applyPeriod: "Search",
    clearPeriod: "Clear",
    noPeriodMatches: "No bookings in the selected period.",
    earned: "Earned",
    bookingsTotal: "Bookings (total)",
    upcomingBookings: "Upcoming bookings",
    next7Days: "Next 7 days",
    carsTotal: "Cars (total)",
    fleet: "Fleet",
    dailyRevenue: "Daily revenue",
    lastDaysSummary: "Last {days} days: total {total} — avg {avg}/day",
    days30: "30 days",
    months2: "2 months",
    months3: "3 months",
    months6: "6 months",
    year1: "1 year",
    byStatus: "Bookings by status",
    statusPaid: "Paid",
    statusCancelled: "Cancelled",
    statusPending: "Pending",
    statusConfirmed: "Confirmed",
    statusCompleted: "Completed",
    recentBookings: "Recent bookings",
    viewAll: "View all",
    colId: "ID",
    colDriver: "Driver",
    colCar: "Car",
    colBookedAt: "Booked at",
    colStart: "Start date",
    colStatus: "Status",
    colPrice: "Price",
    colPaidOnSite: "Paid on site",
    colTotal: "Booking total",
    sectionActive: "Bookings",
    sectionIncomplete: "Unfulfilled",
    sectionCancelled: "Cancelled",
    sectionActiveOnly: "Active",
    sectionCompleted: "Completed",
    searchLabel: "Search booking number",
    searchDigitsPlaceholder: "1000",
    colEmail: "Email",
    colFirstName: "First name",
    colLastName: "Last name",
    colPickup: "Pickup",
    colDropoff: "Drop-off",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    editTitle: "Edit booking",
    confirmDelete: "Delete booking {ref}?",
    saveFailed: "Could not save booking.",
    deleteFailed: "Could not delete booking.",
    statusUnfulfilled: "Unfulfilled",
  },
  telegram: {
    verifiedShort: "Telegram verified",
    verifiedHelp: "Booking notifications will be sent to Telegram.",
    unverifiedBanner: "Activate Telegram to receive booking alerts.",
    verifyButton: "Activate Telegram",
    cardTitle: "Telegram integration",
    cardBody:
      "Activate to link your partner account with the RentAirportCars Telegram bot. Press Start in the bot — you will be added automatically and receive booking alerts here.",
    openBot: "Open Telegram bot",
    statusUnavailable: "Telegram status unavailable",
    activateFailed: "Could not start Telegram link",
    activateRequired: "Activate Telegram to receive booking alerts",
  },
  calendar: {
    calendar: "Calendar",
    history: "History",
    searchPlaceholder: "Booking number",
    bookingSearchPlaceholder: "1000, 1001...",
    bookingSearchAria: "Search booking by number",
    other: "Other",
    account: "Account",
    personalInfo: "Personal info",
    delivery: "Delivery",
    discounts: "Discounts",
    equipmentService: "Additional services",
    integration: "Integration",
    allCars: "All cars",
    addCar: "Add car",
    noCars: "No cars in your fleet yet.",
    loading: "Loading…",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    close: "Close",
    pickup: "Pickup",
    dropoff: "Return",
    updated: "Updated",
  },
  ...partnerUiEn,
};

const ka: PartnerDictionary = {
  language: "ენა",
  signOut: "გასვლა",
  brand: "პარტნიორის პორტალი",
  nav: {
    dashboard: "კალენდარი",
    fleet: "ავტოპარკი",
    bookings: "ჯავშნები",
  },
  dashboard: {
    title: "პარტნიორის პორტალი",
    subtitle: "მართეთ ავტოპარკი და აეროპორტის ჯავშნები. განცხადებები გამოქვეყნდება მხოლოდ ადმინის დამტკიცების შემდეგ.",
    noProfileTitle: "ამ ანგარიშზე პარტნიორის პროფილი არ არის მიბმული.",
    noProfileBody: "თუ ფლოტის მომწოდებელი ხართ, გაგზავნეთ პარტნიორობის განაცხადი საჯარო საიტიდან.",
    becomePartner: "გახდი პარტნიორი",
    basicInfo: "ძირითადი ინფორმაცია",
    basicInfoHelp: "კომპანიის მონაცემები და Telegram ვერიფიკაცია ჯავშნების შეტყობინებებისთვის.",
    company: "კომპანია",
    phone: "ტელეფონი",
    status: "სტატუსი",
    fleet: "ავტოპარკი",
    vehicles: "მანქანა",
    operatingTitle: "ოპერირების ქვეყნები და აეროპორტები",
    operatingHelp: "თქვენი ანგარიშის დამტკიცებული ლოკაციები. განცხადების შექმნისას ჩართეთ მიწოდება ამ აეროპორტებისთვის.",
    noAirports: "აეროპორტები ჯერ არ არის მიბმული. დაუკავშირდით ადმინს ან განაახლეთ რეგისტრაცია კორექციის მოწვევით.",
    fleetListings: "ავტოპარკის განცხადებები",
    bookingLog: "ჯავშნების ჟურნალი",
  },
  fleetPage: {
    title: "ჩემი ავტოპარკი",
    bookings: "ჯავშნები",
    addCar: "ახალი მანქანა",
    edit: "რედაქტირება",
    empty: "ჯერ არც ერთი მანქანა არ დაგიმატებიათ.",
    addFirst: "დაამატეთ პირველი მანქანა",
    perDay: "/დღე",
  },
  bookingsPage: {
    title: "ჯავშნების ჟურნალი",
    customer: "კლიენტი",
    flight: "რეისი",
    contact: "კონტაქტი",
    messenger: "მესენჯერი",
    times: "დროები",
    total: "ჯამი",
    deposit: "დეპოზიტი",
    balance: "დასარჩენი",
    empty: "ჯავშნები ჯერ არ არის.",
    dashboardTitle: "მთავარი დაფა",
    businessOverview: "ბიზნესის მიმოხილვა",
    dateFrom: "დან",
    dateTo: "მდე",
    applyPeriod: "ძებნა",
    clearPeriod: "გასუფთავება",
    noPeriodMatches: "მონიშნულ პერიოდში ჯავშნები არ არის.",
    earned: "გამომუშავებული",
    bookingsTotal: "ჯავშნები (ჯამური)",
    upcomingBookings: "მომავალი ჯავშნები",
    next7Days: "შემდეგი 7 დღე",
    carsTotal: "მანქანები (ჯამური)",
    fleet: "ფლოტი",
    dailyRevenue: "ყოველდღიური შემოსავალი",
    lastDaysSummary: "ბოლო {days} დღე: ჯამში {total} — საშ {avg}/დღე",
    days30: "30 დღე",
    months2: "2 თვე",
    months3: "3 თვე",
    months6: "6 თვე",
    year1: "1 წელი",
    byStatus: "ჯავშნები სტატუსის მიხედვით",
    statusPaid: "გადახდილი",
    statusCancelled: "გაუქმებული",
    statusPending: "მოლოდინში",
    statusConfirmed: "დადასტურებული",
    statusCompleted: "დასრულებული",
    recentBookings: "ბოლო ჯავშნები",
    viewAll: "ყველას ნახვა",
    colId: "ID",
    colDriver: "მძღოლი",
    colCar: "მანქანა",
    colBookedAt: "ჯავშნის დრო",
    colStart: "დაწყების თარიღი",
    colStatus: "სტატუსი",
    colPrice: "ფასი",
    colPaidOnSite: "გადახდილი საიტზე",
    colTotal: "ჯავშნის სრული თანხა",
    sectionActive: "ჯავშნები",
    sectionIncomplete: "არშემდგარი",
    sectionCancelled: "გაუქმებული",
    sectionActiveOnly: "აქტიური",
    sectionCompleted: "დასრულებული",
    searchLabel: "ჯავშნის ნომრის ძებნა",
    searchDigitsPlaceholder: "1000",
    colEmail: "ელფოსტა",
    colFirstName: "სახელი",
    colLastName: "გვარი",
    colPickup: "აღება",
    colDropoff: "დაბრუნება",
    edit: "რედაქტირება",
    delete: "წაშლა",
    save: "შენახვა",
    cancel: "გაუქმება",
    editTitle: "ჯავშნის რედაქტირება",
    confirmDelete: "წავშალოთ ჯავშანი {ref}?",
    saveFailed: "ჯავშნის შენახვა ვერ მოხერხდა.",
    deleteFailed: "ჯავშნის წაშლა ვერ მოხერხდა.",
    statusUnfulfilled: "არშემდგარი",
  },
  telegram: {
    verifiedShort: "Telegram დადასტურებულია",
    verifiedHelp: "ჯავშნების შეტყობინებები მოგივათ Telegram-ზე.",
    unverifiedBanner: "გაააქტიურეთ Telegram ჯავშნების შეტყობინებებისთვის.",
    verifyButton: "Telegram-ის გააქტიურება",
    cardTitle: "Telegram ინტეგრაცია",
    cardBody:
      "გაააქტიურეთ, რომ პარტნიორის ანგარიში დაუკავშირდეს RentAirportCars Telegram ბოტს. ბოტში დააჭირეთ Start-ს — ავტომატურად დაემატებით და აქ მიიღებთ ჯავშნების შეტყობინებებს.",
    openBot: "Telegram ბოტის გახსნა",
    statusUnavailable: "Telegram სტატუსი მიუწვდომელია",
    activateFailed: "Telegram-ის დაკავშირება ვერ მოხერხდა",
    activateRequired: "გაააქტიურეთ Telegram ჯავშნების შეტყობინებებისთვის",
  },
  calendar: {
    calendar: "კალენდარი",
    history: "ისტორია",
    searchPlaceholder: "ჯავშნის ნომერი",
    bookingSearchPlaceholder: "1000, 1001...",
    bookingSearchAria: "ჯავშნის ძებნა ნომრით",
    other: "სხვა",
    account: "ანგარიში",
    personalInfo: "პირადი ინფო",
    delivery: "მიწოდება",
    discounts: "ფასდაკლებები",
    equipmentService: "დამატებითი მომსახურეობა",
    integration: "ინტეგრაცია",
    allCars: "ყველა მანქანა",
    addCar: "მანქანის დამატება",
    noCars: "ავტოპარკში მანქანები ჯერ არ არის.",
    loading: "იტვირთება…",
    zoomIn: "გადიდება",
    zoomOut: "დაპატარავება",
    close: "დახურვა",
    pickup: "აღება",
    dropoff: "დაბრუნება",
    updated: "განახლდა",
  },
  ...partnerUiKa,
};

const ru: PartnerDictionary = {
  language: "Язык",
  signOut: "Выйти",
  brand: "Портал партнёра",
  nav: {
    dashboard: "Календарь",
    fleet: "Автопарк",
    bookings: "Бронирования",
  },
  dashboard: {
    title: "Портал партнёра",
    subtitle: "Управляйте автопарком и аэропортовыми бронированиями. Объявления публикуются только после одобрения админа.",
    noProfileTitle: "К этому аккаунту не привязан профиль партнёра.",
    noProfileBody: "Если вы поставщик автопарка, отправьте заявку с публичного сайта.",
    becomePartner: "Стать партнёром",
    basicInfo: "Основная информация",
    basicInfoHelp: "Данные компании и подтверждение Telegram для уведомлений о бронированиях.",
    company: "Компания",
    phone: "Телефон",
    status: "Статус",
    fleet: "Автопарк",
    vehicles: "авто",
    operatingTitle: "Страны и аэропорты работы",
    operatingHelp: "Одобренные локации вашего аккаунта. Включайте доставку для этих аэропортов при создании объявления.",
    noAirports: "Аэропорты ещё не привязаны. Свяжитесь с админом или обновите регистрацию по приглашению на правки.",
    fleetListings: "Объявления автопарка",
    bookingLog: "Журнал бронирований",
  },
  fleetPage: {
    title: "Мой автопарк",
    bookings: "Бронирования",
    addCar: "Добавить авто",
    edit: "Изменить",
    empty: "Вы ещё не добавили автомобили.",
    addFirst: "Добавьте первый автомобиль",
    perDay: "/день",
  },
  bookingsPage: {
    title: "Журнал бронирований",
    customer: "Клиент",
    flight: "Рейс",
    contact: "Контакт",
    messenger: "Мессенджер",
    times: "Время",
    total: "Итого",
    deposit: "Депозит",
    balance: "К доплате",
    empty: "Бронирований пока нет.",
    dashboardTitle: "Главная панель",
    businessOverview: "Обзор бизнеса",
    dateFrom: "С",
    dateTo: "По",
    applyPeriod: "Найти",
    clearPeriod: "Сбросить",
    noPeriodMatches: "За выбранный период бронирований нет.",
    earned: "Заработано",
    bookingsTotal: "Бронирования (всего)",
    upcomingBookings: "Предстоящие",
    next7Days: "След. 7 дней",
    carsTotal: "Авто (всего)",
    fleet: "Флот",
    dailyRevenue: "Ежедневный доход",
    lastDaysSummary: "Последние {days} дн.: всего {total} — ср. {avg}/день",
    days30: "30 дней",
    months2: "2 мес.",
    months3: "3 мес.",
    months6: "6 мес.",
    year1: "1 год",
    byStatus: "Бронирования по статусу",
    statusPaid: "Оплачено",
    statusCancelled: "Отменено",
    statusPending: "Ожидание",
    statusConfirmed: "Подтверждено",
    statusCompleted: "Завершено",
    recentBookings: "Последние бронирования",
    viewAll: "Смотреть все",
    colId: "ID",
    colDriver: "Водитель",
    colCar: "Авто",
    colBookedAt: "Время брони",
    colStart: "Начало",
    colStatus: "Статус",
    colPrice: "Цена",
    colPaidOnSite: "Оплачено на сайте",
    colTotal: "Полная сумма брони",
    sectionActive: "Бронирования",
    sectionIncomplete: "Несостоявшиеся",
    sectionCancelled: "Отменённые",
    sectionActiveOnly: "Активные",
    sectionCompleted: "Завершённые",
    searchLabel: "Поиск номера брони",
    searchDigitsPlaceholder: "1000",
    colEmail: "Email",
    colFirstName: "Имя",
    colLastName: "Фамилия",
    colPickup: "Получение",
    colDropoff: "Возврат",
    edit: "Изменить",
    delete: "Удалить",
    save: "Сохранить",
    cancel: "Отмена",
    editTitle: "Редактировать бронь",
    confirmDelete: "Удалить бронирование {ref}?",
    saveFailed: "Не удалось сохранить бронирование.",
    deleteFailed: "Не удалось удалить бронирование.",
    statusUnfulfilled: "Несостоявшееся",
  },
  telegram: {
    verifiedShort: "Telegram подтверждён",
    verifiedHelp: "Уведомления о бронированиях будут приходить в Telegram.",
    unverifiedBanner: "Активируйте Telegram для уведомлений о бронированиях.",
    verifyButton: "Активировать Telegram",
    cardTitle: "Интеграция Telegram",
    cardBody:
      "Активируйте, чтобы связать партнёрский аккаунт с ботом RentAirportCars в Telegram. Нажмите Start в боте — вы будете добавлены автоматически и получите уведомления о бронированиях.",
    openBot: "Открыть Telegram-бота",
    statusUnavailable: "Статус Telegram недоступен",
    activateFailed: "Не удалось начать привязку Telegram",
    activateRequired: "Активируйте Telegram для уведомлений о бронированиях",
  },
  calendar: {
    calendar: "Календарь",
    history: "История",
    searchPlaceholder: "Номер брони",
    bookingSearchPlaceholder: "1000, 1001...",
    bookingSearchAria: "Поиск брони по номеру",
    other: "Ещё",
    account: "Аккаунт",
    personalInfo: "Личная инфо",
    delivery: "Доставка",
    discounts: "Скидки",
    equipmentService: "Дополнительные услуги",
    integration: "Интеграция",
    allCars: "Все авто",
    addCar: "Добавить авто",
    noCars: "В автопарке пока нет машин.",
    loading: "Загрузка…",
    zoomIn: "Увеличить",
    zoomOut: "Уменьшить",
    close: "Закрыть",
    pickup: "Получение",
    dropoff: "Возврат",
    updated: "Обновлено",
  },
  ...partnerUiRu,
};

const dictionaries: Partial<Record<PartnerLocale, PartnerDictionary>> & {
  en: PartnerDictionary;
} = { en, ka, ru };

export function getPartnerDictionary(locale: PartnerLocale): PartnerDictionary {
  const exact = dictionaries[locale];
  if (exact) return exact;
  const extra = partnerDictionaryExtras[locale];
  return extra ? fillPartnerDictionary(dictionaries.en, extra) : dictionaries.en;
}
