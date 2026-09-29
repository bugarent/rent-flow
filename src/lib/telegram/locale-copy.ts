import type { Locale } from "@/lib/i18n/config";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";

type BookingNotifyCopy = {
  newBooking: string;
  editedBooking: string;
  cancelledBooking: string;
  reference: string;
  car: string;
  pickup: string;
  dropoff: string;
  flight: string;
  customer: string;
  phone: string;
  email: string;
};

type BotCopy = {
  dashboardVerified: string;
  dashboardExpired: string;
  dashboardUnknown: string;
  dashboardNeedButton: string;
  registerVerified: string;
  registerExpired: string;
  registerUnknown: string;
  registerConsumed: string;
  welcome: string;
};

const bookingCopy: Partial<Record<Locale, BookingNotifyCopy>> = {
  en: {
    newBooking: "🆕 New booking",
    editedBooking: "✏️ Booking updated",
    cancelledBooking: "❌ Booking cancelled",
    reference: "Reference",
    car: "Car",
    pickup: "Pick-up",
    dropoff: "Drop-off",
    flight: "Flight",
    customer: "Customer",
    phone: "Phone",
    email: "Email",
  },
  ka: {
    newBooking: "🆕 ახალი ჯავშანი",
    editedBooking: "✏️ ჯავშანი განახლდა",
    cancelledBooking: "❌ ჯავშანი გაუქმდა",
    reference: "რეფერენსი",
    car: "მანქანა",
    pickup: "აღება",
    dropoff: "დაბრუნება",
    flight: "ფრენა",
    customer: "კლიენტი",
    phone: "ტელეფონი",
    email: "ელფოსტა",
  },
  ru: {
    newBooking: "🆕 Новое бронирование",
    editedBooking: "✏️ Бронирование обновлено",
    cancelledBooking: "❌ Бронирование отменено",
    reference: "Номер",
    car: "Авто",
    pickup: "Получение",
    dropoff: "Возврат",
    flight: "Рейс",
    customer: "Клиент",
    phone: "Телефон",
    email: "Email",
  },
  fr: {
    newBooking: "🆕 Nouvelle réservation",
    editedBooking: "✏️ Réservation mise à jour",
    cancelledBooking: "❌ Réservation annulée",
    reference: "Référence",
    car: "Véhicule",
    pickup: "Prise en charge",
    dropoff: "Retour",
    flight: "Vol",
    customer: "Client",
    phone: "Téléphone",
    email: "E-mail",
  },
  de: {
    newBooking: "🆕 Neue Buchung",
    editedBooking: "✏️ Buchung aktualisiert",
    cancelledBooking: "❌ Buchung storniert",
    reference: "Referenz",
    car: "Fahrzeug",
    pickup: "Abholung",
    dropoff: "Rückgabe",
    flight: "Flug",
    customer: "Kunde",
    phone: "Telefon",
    email: "E-Mail",
  },
  pl: {
    newBooking: "🆕 Nowa rezerwacja",
    editedBooking: "✏️ Rezerwacja zaktualizowana",
    cancelledBooking: "❌ Rezerwacja anulowana",
    reference: "Numer",
    car: "Samochód",
    pickup: "Odbiór",
    dropoff: "Zwrot",
    flight: "Lot",
    customer: "Klient",
    phone: "Telefon",
    email: "E-mail",
  },
  ar: {
    newBooking: "🆕 حجز جديد",
    editedBooking: "✏️ تم تحديث الحجز",
    cancelledBooking: "❌ تم إلغاء الحجز",
    reference: "المرجع",
    car: "السيارة",
    pickup: "الاستلام",
    dropoff: "التسليم",
    flight: "الرحلة",
    customer: "العميل",
    phone: "الهاتف",
    email: "البريد",
  },
};

const botCopy: Partial<Record<Locale, BotCopy>> = {
  en: {
    dashboardVerified:
      "✅ Telegram verified for your partner account.\n\nReturn to the partner dashboard — booking alerts will arrive here.",
    dashboardExpired: "This verification link has expired. Open the partner dashboard and tap Verify Telegram again.",
    dashboardUnknown: "Unknown partner verification link. Open the partner dashboard and tap Verify Telegram.",
    dashboardNeedButton:
      "Open your partner dashboard on the website and tap “Verify Telegram”, then press Start from that link.",
    registerVerified:
      "✅ Telegram verified for partner registration.\n\nReturn to the website — the Register button is now unlocked.",
    registerExpired: "This verification code has expired. Generate a new one on the registration page.",
    registerUnknown: "Unknown verification code. Use “Start Bot & Verify” on the registration page.",
    registerConsumed: "This code was already used for registration.",
    welcome:
      "Welcome to RentAirportCars partner verification.\n\nUse “Verify Telegram” in the partner dashboard, or “Start Bot & Verify” on registration.",
  },
  ka: {
    dashboardVerified:
      "✅ Telegram დადასტურებულია თქვენი პარტნიორის ანგარიშისთვის.\n\nდაბრუნდით დეშბორდზე — ჯავშნების შეტყობინებები აქ მოგივათ.",
    dashboardExpired:
      "ვერიფიკაციის ბმულს ვადა გაუვიდა. გახსენით პარტნიორის დეშბორდი და კვლავ დააჭირეთ „Telegram-ის დადასტურება“.",
    dashboardUnknown:
      "უცნობი ვერიფიკაციის ბმული. გახსენით პარტნიორის დეშბორდი და დააჭირეთ „Telegram-ის დადასტურება“.",
    dashboardNeedButton:
      "გახსენით პარტნიორის დეშბორდი საიტზე, დააჭირეთ „Telegram-ის დადასტურება“, შემდეგ Start ამ ბმულიდან.",
    registerVerified:
      "✅ Telegram დადასტურებულია რეგისტრაციისთვის.\n\nდაბრუნდით საიტზე — რეგისტრაციის ღილაკი ახლა ხელმისაწვდომია.",
    registerExpired: "ვერიფიკაციის კოდს ვადა გაუვიდა. შექმენით ახალი რეგისტრაციის გვერდზე.",
    registerUnknown: "უცნობი კოდი. გამოიყენეთ „Start Bot & Verify“ რეგისტრაციის გვერდზე.",
    registerConsumed: "ეს კოდი უკვე გამოყენებულია რეგისტრაციისთვის.",
    welcome:
      "მოგესალმებით RentAirportCars პარტნიორის ვერიფიკაციაში.\n\nგამოიყენეთ „Telegram-ის დადასტურება“ დეშბორდზე ან „Start Bot & Verify“ რეგისტრაციაზე.",
  },
  ru: {
    dashboardVerified:
      "✅ Telegram подтверждён для партнёрского аккаунта.\n\nВернитесь в кабинет — уведомления о бронированиях будут приходить сюда.",
    dashboardExpired: "Срок ссылки истёк. Откройте кабинет партнёра и снова нажмите «Подтвердить Telegram».",
    dashboardUnknown: "Неизвестная ссылка. Откройте кабинет партнёра и нажмите «Подтвердить Telegram».",
    dashboardNeedButton:
      "Откройте кабинет партнёра на сайте, нажмите «Подтвердить Telegram», затем Start по этой ссылке.",
    registerVerified:
      "✅ Telegram подтверждён для регистрации.\n\nВернитесь на сайт — кнопка регистрации теперь доступна.",
    registerExpired: "Код истёк. Создайте новый на странице регистрации.",
    registerUnknown: "Неизвестный код. Используйте «Start Bot & Verify» на странице регистрации.",
    registerConsumed: "Этот код уже использован для регистрации.",
    welcome:
      "Добро пожаловать в проверку партнёра RentAirportCars.\n\nИспользуйте «Подтвердить Telegram» в кабинете или «Start Bot & Verify» при регистрации.",
  },
  fr: {
    dashboardVerified:
      "✅ Telegram vérifié pour votre compte partenaire.\n\nRetournez au tableau de bord — les alertes de réservation arriveront ici.",
    dashboardExpired: "Ce lien a expiré. Rouvrez le tableau de bord et appuyez à nouveau sur Vérifier Telegram.",
    dashboardUnknown: "Lien inconnu. Ouvrez le tableau de bord partenaire et appuyez sur Vérifier Telegram.",
    dashboardNeedButton:
      "Ouvrez le tableau de bord partenaire, appuyez sur « Vérifier Telegram », puis Start depuis ce lien.",
    registerVerified:
      "✅ Telegram vérifié pour l'inscription.\n\nRetournez au site — le bouton d'inscription est débloqué.",
    registerExpired: "Ce code a expiré. Générez-en un nouveau sur la page d'inscription.",
    registerUnknown: "Code inconnu. Utilisez « Start Bot & Verify » sur la page d'inscription.",
    registerConsumed: "Ce code a déjà été utilisé pour l'inscription.",
    welcome:
      "Bienvenue dans la vérification partenaire RentAirportCars.\n\nUtilisez « Vérifier Telegram » dans le tableau de bord ou à l'inscription.",
  },
  de: {
    dashboardVerified:
      "✅ Telegram für Ihr Partnerkonto verifiziert.\n\nKehren Sie zum Dashboard zurück — Buchungswarnungen kommen hier an.",
    dashboardExpired:
      "Dieser Link ist abgelaufen. Öffnen Sie das Partner-Dashboard und tippen Sie erneut auf Telegram verifizieren.",
    dashboardUnknown:
      "Unbekannter Link. Öffnen Sie das Partner-Dashboard und tippen Sie auf Telegram verifizieren.",
    dashboardNeedButton:
      "Öffnen Sie das Partner-Dashboard, tippen Sie auf „Telegram verifizieren“, dann Start über diesen Link.",
    registerVerified:
      "✅ Telegram für die Registrierung verifiziert.\n\nKehren Sie zur Website zurück — die Registrierung ist freigeschaltet.",
    registerExpired: "Dieser Code ist abgelaufen. Erzeugen Sie einen neuen auf der Registrierungsseite.",
    registerUnknown: "Unbekannter Code. Nutzen Sie „Start Bot & Verify“ auf der Registrierungsseite.",
    registerConsumed: "Dieser Code wurde bereits für die Registrierung verwendet.",
    welcome:
      "Willkommen bei der RentAirportCars-Partnerverifizierung.\n\nNutzen Sie „Telegram verifizieren“ im Dashboard oder bei der Registrierung.",
  },
  pl: {
    dashboardVerified:
      "✅ Telegram zweryfikowany dla konta partnera.\n\nWróć do panelu — powiadomienia o rezerwacjach będą przychodzić tutaj.",
    dashboardExpired:
      "Link wygasł. Otwórz panel partnera i ponownie kliknij Zweryfikuj Telegram.",
    dashboardUnknown: "Nieznany link. Otwórz panel partnera i kliknij Zweryfikuj Telegram.",
    dashboardNeedButton:
      "Otwórz panel partnera, kliknij „Zweryfikuj Telegram”, a następnie Start z tego linku.",
    registerVerified:
      "✅ Telegram zweryfikowany do rejestracji.\n\nWróć na stronę — przycisk rejestracji jest odblokowany.",
    registerExpired: "Kod wygasł. Wygeneruj nowy na stronie rejestracji.",
    registerUnknown: "Nieznany kod. Użyj „Start Bot & Verify” na stronie rejestracji.",
    registerConsumed: "Ten kod został już użyty do rejestracji.",
    welcome:
      "Witamy w weryfikacji partnera RentAirportCars.\n\nUżyj „Zweryfikuj Telegram” w panelu lub przy rejestracji.",
  },
  ar: {
    dashboardVerified:
      "✅ تم تأكيد تيليجرام لحساب الشريك.\n\nعد إلى لوحة التحكم — ستصلك إشعارات الحجوزات هنا.",
    dashboardExpired: "انتهت صلاحية الرابط. افتح لوحة الشريك واضغط مجددًا على تأكيد تيليجرام.",
    dashboardUnknown: "رابط غير معروف. افتح لوحة الشريك واضغط تأكيد تيليجرام.",
    dashboardNeedButton:
      "افتح لوحة الشريك في الموقع، اضغط «تأكيد تيليجرام»، ثم Start من هذا الرابط.",
    registerVerified:
      "✅ تم تأكيد تيليجرام للتسجيل.\n\nعد إلى الموقع — زر التسجيل أصبح متاحًا.",
    registerExpired: "انتهت صلاحية الرمز. أنشئ رمزًا جديدًا في صفحة التسجيل.",
    registerUnknown: "رمز غير معروف. استخدم «Start Bot & Verify» في صفحة التسجيل.",
    registerConsumed: "تم استخدام هذا الرمز مسبقًا للتسجيل.",
    welcome:
      "مرحبًا بك في تحقق شريك RentAirportCars.\n\nاستخدم «تأكيد تيليجرام» في اللوحة أو عند التسجيل.",
  },
};

export function resolveTelegramLocale(value?: string | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function telegramBookingCopy(locale?: string | null): BookingNotifyCopy {
  return bookingCopy[resolveTelegramLocale(locale)] ?? bookingCopy.en!;
}

export function telegramBotCopy(locale?: string | null): BotCopy {
  return botCopy[resolveTelegramLocale(locale)] ?? botCopy.en!;
}
