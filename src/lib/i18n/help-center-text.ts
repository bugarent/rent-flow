import type { Locale } from "@/lib/i18n/config";
import type { HelpCategory } from "@/lib/catalog/help-center";

type Row = Partial<Record<Locale, string>> & { en?: string };

type HelpEntry = { en: string; row: Row };

const BY_NORM = new Map<string, HelpEntry>();

function normHelp(source: string) {
  return source
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function indexHelp(phrase: string, entry: HelpEntry) {
  const norm = normHelp(phrase);
  if (!norm) return;
  BY_NORM.set(norm, entry);
  BY_NORM.set(norm.toLowerCase(), entry);
  BY_NORM.set(norm.replace(/\s+/g, " "), entry);
  BY_NORM.set(norm.replace(/\s+/g, " ").toLowerCase(), entry);
}

function lookupHelp(source: string): HelpEntry | undefined {
  const norm = normHelp(source);
  return (
    BY_NORM.get(norm) ||
    BY_NORM.get(norm.toLowerCase()) ||
    BY_NORM.get(norm.replace(/\s+/g, " ")) ||
    BY_NORM.get(norm.replace(/\s+/g, " ").toLowerCase())
  );
}

function pack(
  ka: string,
  de: string,
  es: string,
  fr: string,
  it: string,
  nl: string,
  pl: string,
  tr: string,
  ru: string,
  ar: string,
  zh: string,
  ko: string,
  th: string,
): Row {
  return { ka, de, es, fr, it, nl, pl, tr, ru, ar, zh, ko, th };
}

export function registerHelpText(source: string, values: Row) {
  const entry: HelpEntry = { en: source, row: values };
  indexHelp(source, entry);
  for (const phrase of Object.values(values)) {
    if (typeof phrase === "string" && phrase.trim()) indexHelp(phrase, entry);
  }
}

function helpPhrase(locale: string, entry: HelpEntry) {
  if (!locale || locale === "en") return entry.en;
  const value = entry.row[locale as Locale];
  return value && value.trim() ? value : entry.en;
}

/** Show a known help-center phrase in the selected language. Unknown text stays as saved. */
export function helpText(locale: string, source: string): string {
  const raw = String(source ?? "");
  if (!raw.trim()) return raw;
  const hit = lookupHelp(raw);
  if (hit) return helpPhrase(locale, hit);
  if (raw.includes("\n")) {
    let changed = false;
    const lines = raw.split("\n").map((line) => {
      const row = lookupHelp(line);
      if (!row) return line;
      changed = true;
      return helpPhrase(locale, row);
    });
    if (changed) return lines.join("\n");
  }
  return raw;
}

export function fillHelpCount(template: string, n: number) {
  return template.replaceAll("{n}", String(n));
}

export type HelpAdminLabels = {
  addCategory: string;
  addTopic: string;
  addQuestion: string;
  deleteTopic: string;
  category: string;
  topic: string;
  questionNo: string;
  question: string;
  answer: string;
  trending: string;
  categoryPh: string;
  topicPh: string;
  viewAll: string;
  trendingArticles: string;
  stillNeed: string;
  contactUs: string;
  helpful: string;
  yes: string;
  no: string;
};

const LABELS: Record<Locale, HelpAdminLabels> = {
  en: {
    addCategory: "Add category",
    addTopic: "Add topic",
    addQuestion: "Add question",
    deleteTopic: "Delete topic",
    category: "Category #{n}",
    topic: "Topic #{n}",
    questionNo: "Q#{n}",
    question: "Question",
    answer: "Answer",
    trending: "Trending",
    categoryPh: "e.g. Payment And Deposit",
    topicPh: "e.g. Payments",
    viewAll: "View all ({n})",
    trendingArticles: "Trending articles",
    stillNeed: "Still need help?",
    contactUs: "contact us",
    helpful: "Was this article helpful?",
    yes: "Yes",
    no: "No",
  },
  ka: {
    addCategory: "კატეგორიის დამატება",
    addTopic: "თემის დამატება",
    addQuestion: "კითხვის დამატება",
    deleteTopic: "თემის წაშლა",
    category: "კატეგორია #{n}",
    topic: "თემა #{n}",
    questionNo: "კ#{n}",
    question: "კითხვა",
    answer: "პასუხი",
    trending: "პოპულარული",
    categoryPh: "მაგ. გადახდა და დეპოზიტი",
    topicPh: "მაგ. გადახდები",
    viewAll: "ყველას ნახვა ({n})",
    trendingArticles: "პოპულარული სტატიები",
    stillNeed: "კიდევ გჭირდებათ დახმარება?",
    contactUs: "დაგვიკავშირდით",
    helpful: "სასარგებლო იყო ეს სტატია?",
    yes: "დიახ",
    no: "არა",
  },
  de: {
    addCategory: "Kategorie hinzufügen",
    addTopic: "Thema hinzufügen",
    addQuestion: "Frage hinzufügen",
    deleteTopic: "Thema löschen",
    category: "Kategorie #{n}",
    topic: "Thema #{n}",
    questionNo: "F#{n}",
    question: "Frage",
    answer: "Antwort",
    trending: "Beliebt",
    categoryPh: "z. B. Zahlung und Kaution",
    topicPh: "z. B. Zahlungen",
    viewAll: "Alle anzeigen ({n})",
    trendingArticles: "Beliebte Artikel",
    stillNeed: "Noch Hilfe nötig?",
    contactUs: "kontaktieren Sie uns",
    helpful: "War dieser Artikel hilfreich?",
    yes: "Ja",
    no: "Nein",
  },
  es: {
    addCategory: "Añadir categoría",
    addTopic: "Añadir tema",
    addQuestion: "Añadir pregunta",
    deleteTopic: "Eliminar tema",
    category: "Categoría #{n}",
    topic: "Tema #{n}",
    questionNo: "P#{n}",
    question: "Pregunta",
    answer: "Respuesta",
    trending: "Tendencia",
    categoryPh: "p. ej. Pago y depósito",
    topicPh: "p. ej. Pagos",
    viewAll: "Ver todo ({n})",
    trendingArticles: "Artículos destacados",
    stillNeed: "¿Aún necesita ayuda?",
    contactUs: "contáctenos",
    helpful: "¿Le ha resultado útil este artículo?",
    yes: "Sí",
    no: "No",
  },
  fr: {
    addCategory: "Ajouter une catégorie",
    addTopic: "Ajouter un sujet",
    addQuestion: "Ajouter une question",
    deleteTopic: "Supprimer le sujet",
    category: "Catégorie #{n}",
    topic: "Sujet #{n}",
    questionNo: "Q#{n}",
    question: "Question",
    answer: "Réponse",
    trending: "Tendance",
    categoryPh: "ex. Paiement et dépôt",
    topicPh: "ex. Paiements",
    viewAll: "Tout voir ({n})",
    trendingArticles: "Articles tendance",
    stillNeed: "Besoin d’aide encore ?",
    contactUs: "contactez-nous",
    helpful: "Cet article vous a-t-il aidé ?",
    yes: "Oui",
    no: "Non",
  },
  it: {
    addCategory: "Aggiungi categoria",
    addTopic: "Aggiungi argomento",
    addQuestion: "Aggiungi domanda",
    deleteTopic: "Elimina argomento",
    category: "Categoria #{n}",
    topic: "Argomento #{n}",
    questionNo: "D#{n}",
    question: "Domanda",
    answer: "Risposta",
    trending: "Di tendenza",
    categoryPh: "es. Pagamento e deposito",
    topicPh: "es. Pagamenti",
    viewAll: "Vedi tutto ({n})",
    trendingArticles: "Articoli di tendenza",
    stillNeed: "Serve ancora aiuto?",
    contactUs: "contattaci",
    helpful: "Questo articolo è stato utile?",
    yes: "Sì",
    no: "No",
  },
  nl: {
    addCategory: "Categorie toevoegen",
    addTopic: "Onderwerp toevoegen",
    addQuestion: "Vraag toevoegen",
    deleteTopic: "Onderwerp verwijderen",
    category: "Categorie #{n}",
    topic: "Onderwerp #{n}",
    questionNo: "V#{n}",
    question: "Vraag",
    answer: "Antwoord",
    trending: "Trending",
    categoryPh: "bijv. Betaling en borg",
    topicPh: "bijv. Betalingen",
    viewAll: "Alles bekijken ({n})",
    trendingArticles: "Populaire artikelen",
    stillNeed: "Nog hulp nodig?",
    contactUs: "neem contact op",
    helpful: "Was dit artikel nuttig?",
    yes: "Ja",
    no: "Nee",
  },
  pl: {
    addCategory: "Dodaj kategorię",
    addTopic: "Dodaj temat",
    addQuestion: "Dodaj pytanie",
    deleteTopic: "Usuń temat",
    category: "Kategoria #{n}",
    topic: "Temat #{n}",
    questionNo: "P#{n}",
    question: "Pytanie",
    answer: "Odpowiedź",
    trending: "Popularne",
    categoryPh: "np. Płatność i kaucja",
    topicPh: "np. Płatności",
    viewAll: "Zobacz wszystko ({n})",
    trendingArticles: "Popularne artykuły",
    stillNeed: "Nadal potrzebujesz pomocy?",
    contactUs: "skontaktuj się z nami",
    helpful: "Czy ten artykuł był pomocny?",
    yes: "Tak",
    no: "Nie",
  },
  tr: {
    addCategory: "Kategori ekle",
    addTopic: "Konu ekle",
    addQuestion: "Soru ekle",
    deleteTopic: "Konuyu sil",
    category: "Kategori #{n}",
    topic: "Konu #{n}",
    questionNo: "S#{n}",
    question: "Soru",
    answer: "Yanıt",
    trending: "Öne çıkan",
    categoryPh: "ör. Ödeme ve depozito",
    topicPh: "ör. Ödemeler",
    viewAll: "Tümünü gör ({n})",
    trendingArticles: "Öne çıkan yazılar",
    stillNeed: "Hâlâ yardıma mı ihtiyacınız var?",
    contactUs: "bize ulaşın",
    helpful: "Bu yazı yardımcı oldu mu?",
    yes: "Evet",
    no: "Hayır",
  },
  ru: {
    addCategory: "Добавить категорию",
    addTopic: "Добавить тему",
    addQuestion: "Добавить вопрос",
    deleteTopic: "Удалить тему",
    category: "Категория #{n}",
    topic: "Тема #{n}",
    questionNo: "В#{n}",
    question: "Вопрос",
    answer: "Ответ",
    trending: "Популярное",
    categoryPh: "напр. Оплата и депозит",
    topicPh: "напр. Оплаты",
    viewAll: "Смотреть все ({n})",
    trendingArticles: "Популярные статьи",
    stillNeed: "Нужна ещё помощь?",
    contactUs: "свяжитесь с нами",
    helpful: "Эта статья была полезна?",
    yes: "Да",
    no: "Нет",
  },
  ar: {
    addCategory: "إضافة فئة",
    addTopic: "إضافة موضوع",
    addQuestion: "إضافة سؤال",
    deleteTopic: "حذف الموضوع",
    category: "الفئة #{n}",
    topic: "الموضوع #{n}",
    questionNo: "س#{n}",
    question: "السؤال",
    answer: "الإجابة",
    trending: "رائج",
    categoryPh: "مثال: الدفع والتأمين",
    topicPh: "مثال: المدفوعات",
    viewAll: "عرض الكل ({n})",
    trendingArticles: "مقالات رائجة",
    stillNeed: "هل ما زلت تحتاج مساعدة؟",
    contactUs: "تواصل معنا",
    helpful: "هل كانت هذه المقالة مفيدة؟",
    yes: "نعم",
    no: "لا",
  },
  zh: {
    addCategory: "添加分类",
    addTopic: "添加主题",
    addQuestion: "添加问题",
    deleteTopic: "删除主题",
    category: "分类 #{n}",
    topic: "主题 #{n}",
    questionNo: "问 #{n}",
    question: "问题",
    answer: "回答",
    trending: "热门",
    categoryPh: "例如：付款与押金",
    topicPh: "例如：付款",
    viewAll: "查看全部（{n}）",
    trendingArticles: "热门文章",
    stillNeed: "还需要帮助吗？",
    contactUs: "联系我们",
    helpful: "这篇文章有帮助吗？",
    yes: "是",
    no: "否",
  },
  ko: {
    addCategory: "분류 추가",
    addTopic: "주제 추가",
    addQuestion: "질문 추가",
    deleteTopic: "주제 삭제",
    category: "분류 #{n}",
    topic: "주제 #{n}",
    questionNo: "질 #{n}",
    question: "질문",
    answer: "답변",
    trending: "인기",
    categoryPh: "예: 결제 및 보증금",
    topicPh: "예: 결제",
    viewAll: "모두 보기 ({n})",
    trendingArticles: "인기 글",
    stillNeed: "아직 도움이 필요하신가요?",
    contactUs: "문의하기",
    helpful: "이 글이 도움이 되었나요?",
    yes: "예",
    no: "아니요",
  },
  th: {
    addCategory: "เพิ่มหมวดหมู่",
    addTopic: "เพิ่มหัวข้อ",
    addQuestion: "เพิ่มคำถาม",
    deleteTopic: "ลบหัวข้อ",
    category: "หมวดหมู่ #{n}",
    topic: "หัวข้อ #{n}",
    questionNo: "ถ#{n}",
    question: "คำถาม",
    answer: "คำตอบ",
    trending: "ยอดนิยม",
    categoryPh: "เช่น การชำระเงินและเงินมัดจำ",
    topicPh: "เช่น การชำระเงิน",
    viewAll: "ดูทั้งหมด ({n})",
    trendingArticles: "บทความยอดนิยม",
    stillNeed: "ยังต้องการความช่วยเหลือหรือไม่?",
    contactUs: "ติดต่อเรา",
    helpful: "บทความนี้มีประโยชน์หรือไม่?",
    yes: "ใช่",
    no: "ไม่",
  },
};

export function helpAdminLabels(locale: string): HelpAdminLabels {
  return LABELS[locale as Locale] ?? LABELS.en;
}

export function localizeHelpCategory(category: HelpCategory, locale: string): HelpCategory {
  return {
    ...category,
    title: helpText(locale, category.title),
    topics: category.topics.map((topic) => ({
      ...topic,
      title: helpText(locale, topic.title),
      articles: topic.articles.map((article) => ({
        ...article,
        question: helpText(locale, article.question),
        answer: helpText(locale, article.answer),
      })),
    })),
  };
}

registerHelpText(
  "General Queries",
  pack(
    "ზოგადი კითხვები",
    "Allgemeine Fragen",
    "Consultas generales",
    "Questions générales",
    "Domande generali",
    "Algemene vragen",
    "Pytania ogólne",
    "Genel sorular",
    "Общие вопросы",
    "استفسارات عامة",
    "常见问题",
    "일반 문의",
    "คำถามทั่วไป",
  ),
);
registerHelpText(
  "Booking",
  pack(
    "ჯავშანი",
    "Buchung",
    "Reserva",
    "Réservation",
    "Prenotazione",
    "Boeking",
    "Rezerwacja",
    "Rezervasyon",
    "Бронирование",
    "الحجز",
    "预订",
    "예약",
    "การจอง",
  ),
);
registerHelpText(
  "Rental Car",
  pack(
    "ავტომობილის გაქირავება",
    "Mietwagen",
    "Coche de alquiler",
    "Voiture de location",
    "Auto a noleggio",
    "Huurauto",
    "Samochód na wynajem",
    "Kiralık araç",
    "Аренда авто",
    "سيارة الإيجار",
    "租车",
    "렌터카",
    "รถเช่า",
  ),
);
registerHelpText(
  "Manage Booking",
  pack(
    "ჯავშნის მართვა",
    "Buchung verwalten",
    "Gestionar la reserva",
    "Gérer la réservation",
    "Gestisci prenotazione",
    "Boeking beheren",
    "Zarządzaj rezerwacją",
    "Rezervasyonu yönet",
    "Управление бронированием",
    "إدارة الحجز",
    "管理预订",
    "예약 관리",
    "จัดการการจอง",
  ),
);
registerHelpText(
  "Amend Your Booking",
  pack(
    "ჯავშნის შეცვლა",
    "Buchung ändern",
    "Modificar la reserva",
    "Modifier la réservation",
    "Modifica la prenotazione",
    "Boeking wijzigen",
    "Zmień rezerwację",
    "Rezervasyonu değiştir",
    "Изменить бронирование",
    "تعديل الحجز",
    "修改预订",
    "예약 변경",
    "แก้ไขการจอง",
  ),
);
registerHelpText(
  "Cancel Booking",
  pack(
    "ჯავშნის გაუქმება",
    "Buchung stornieren",
    "Cancelar la reserva",
    "Annuler la réservation",
    "Annulla prenotazione",
    "Boeking annuleren",
    "Anuluj rezerwację",
    "Rezervasyonu iptal et",
    "Отменить бронирование",
    "إلغاء الحجز",
    "取消预订",
    "예약 취소",
    "ยกเลิกการจอง",
  ),
);
registerHelpText(
  "Payment And Deposit",
  pack(
    "გადახდა და დეპოზიტი",
    "Zahlung und Kaution",
    "Pago y depósito",
    "Paiement et dépôt",
    "Pagamento e deposito",
    "Betaling en borg",
    "Płatność i kaucja",
    "Ödeme ve depozito",
    "Оплата и депозит",
    "الدفع والتأمين",
    "付款与押金",
    "결제 및 보증금",
    "การชำระเงินและเงินมัดจำ",
  ),
);
registerHelpText(
  "Payments",
  pack(
    "გადახდები",
    "Zahlungen",
    "Pagos",
    "Paiements",
    "Pagamenti",
    "Betalingen",
    "Płatności",
    "Ödemeler",
    "Оплаты",
    "المدفوعات",
    "付款",
    "결제",
    "การชำระเงิน",
  ),
);
registerHelpText(
  "Security Deposit",
  pack(
    "გარანტიის დეპოზიტი",
    "Kaution",
    "Depósito de seguridad",
    "Dépôt de garantie",
    "Deposito cauzionale",
    "Borg",
    "Kaucja",
    "Güvence depozitosu",
    "Залог",
    "تأمين الضمان",
    "保证金",
    "보증금",
    "เงินประกัน",
  ),
);
registerHelpText(
  "Cancellation",
  pack(
    "გაუქმება",
    "Stornierung",
    "Cancelación",
    "Annulation",
    "Cancellazione",
    "Annulering",
    "Anulowanie",
    "İptal",
    "Отмена",
    "الإلغاء",
    "取消",
    "취소",
    "การยกเลิก",
  ),
);
registerHelpText(
  "Driver Requirements",
  pack(
    "მძღოლის მოთხოვნები",
    "Fahrervoraussetzungen",
    "Requisitos del conductor",
    "Conditions du conducteur",
    "Requisiti del conducente",
    "Eisen voor de bestuurder",
    "Wymagania wobec kierowcy",
    "Sürücü koşulları",
    "Требования к водителю",
    "متطلبات السائق",
    "驾驶员要求",
    "운전자 요건",
    "ข้อกำหนดผู้ขับ",
  ),
);
registerHelpText(
  "Driver's Age",
  pack(
    "მძღოლის ასაკი",
    "Alter des Fahrers",
    "Edad del conductor",
    "Âge du conducteur",
    "Età del conducente",
    "Leeftijd van de bestuurder",
    "Wiek kierowcy",
    "Sürücü yaşı",
    "Возраст водителя",
    "عمر السائق",
    "驾驶员年龄",
    "운전자 나이",
    "อายุผู้ขับ",
  ),
);
registerHelpText(
  "License Requirements",
  pack(
    "მართვის მოწმობის მოთხოვნები",
    "Führerschein-Anforderungen",
    "Requisitos del permiso",
    "Conditions du permis",
    "Requisiti della patente",
    "Rijbewijsvereisten",
    "Wymagania prawa jazdy",
    "Ehliyet koşulları",
    "Требования к правам",
    "متطلبات الرخصة",
    "驾照要求",
    "면허 요건",
    "ข้อกำหนดใบขับขี่",
  ),
);
registerHelpText(
  "Pick-Up & Drop-Off",
  pack(
    "აღება და დაბრუნება",
    "Abholung und Rückgabe",
    "Recogida y devolución",
    "Prise en charge et retour",
    "Ritiro e riconsegna",
    "Ophalen en terugbrengen",
    "Odbiór i zwrot",
    "Teslim alma ve bırakma",
    "Получение и возврат",
    "الاستلام والتسليم",
    "取车与还车",
    "인수 및 반납",
    "รับรถและคืนรถ",
  ),
);
registerHelpText(
  "Pick-Up",
  pack(
    "აღება",
    "Abholung",
    "Recogida",
    "Prise en charge",
    "Ritiro",
    "Ophalen",
    "Odbiór",
    "Teslim alma",
    "Получение",
    "الاستلام",
    "取车",
    "인수",
    "รับรถ",
  ),
);
registerHelpText(
  "Drop-Off",
  pack(
    "დაბრუნება",
    "Rückgabe",
    "Devolución",
    "Retour",
    "Riconsegna",
    "Terugbrengen",
    "Zwrot",
    "Teslim etme",
    "Возврат",
    "التسليم",
    "还车",
    "반납",
    "คืนรถ",
  ),
);
registerHelpText(
  "One-Way & Cross Border",
  pack(
    "ცალმხრივი და საზღვრის გადაკვეთა",
    "Einweg und Grenzübertritt",
    "Solo ida y cruce de frontera",
    "Aller simple et transfrontalier",
    "Solo andata e transfrontaliero",
    "Enkele reis en grens",
    "W jedną stronę i granica",
    "Tek yön ve sınır geçişi",
    "В одну сторону и граница",
    "اتجاه واحد وعبور الحدود",
    "单程与跨境",
    "편도 및 국경",
    "เที่ยวเดียวและข้ามพรมแดน",
  ),
);
