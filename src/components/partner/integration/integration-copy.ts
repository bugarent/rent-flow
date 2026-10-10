const ka = {
  importTab: "შემომავალი ინტეგრაცია (Import)",
  exportTab: "გამავალი ინტეგრაცია (Export)",
  apiTitle: "API ინტეგრაცია და Webhooks",
  apiHint:
    "API გასაღებით თქვენი ჩანელ მენეჯერი ან საიტი ავტომატურად განაახლებს მანქანების თავისუფალ დღეებს და ფასებს.",
  apiKey: "API გასაღები",
  noKey: "გასაღები ჯერ არ შექმნილა.",
  generate: "ახალი API გასაღების გენერაცია",
  regenerate: "ახალი გასაღების გენერაცია",
  regenerateConfirm: "ახალი გასაღები ძველს გააუქმებს. ძველი გასაღებით მიერთებული სისტემები შეწყვეტენ მუშაობას. გავაგრძელოთ?",
  newKeyNotice: "შეინახეთ ეს გასაღები ახლავე — უსაფრთხოების მიზნით ის მხოლოდ ერთხელ ჩანს.",
  keyCreated: "შექმნილია",
  lastUsed: "ბოლოს გამოყენდა",
  never: "ჯერ არა",
  baseUrl: "API მისამართი",
  webhookUrl: "Partner Webhook URL",
  webhookHint: "ახალი, დადასტურებული, შეცვლილი ან გაუქმებული ჯავშნისას ამ მისამართზე გამოგიგზავნით POST მოთხოვნას.",
  webhookPlaceholder: "https://your-system.com/webhooks/rentairportcars",
  webhookSecret: "Webhook საიდუმლო (ხელმოწერისთვის)",
  save: "შენახვა",
  saving: "ინახება…",
  saved: "შენახულია",
  test: "სატესტო გაგზავნა",
  testOk: "სატესტო webhook მიღებულია",
  testFail: "სატესტო webhook ვერ მივიდა",
  webhookInvalid: "მისამართი უნდა იყოს საჯარო https ბმული.",
  docs: "API დოკუმენტაცია",
  icalTitle: "iCal სინქრონიზაციის პარამეტრები",
  icalHint:
    "თითო მანქანას შეგიძლიათ მიაბათ გარე კალენდრის (.ics) ბმული. სისტემა მას ყოველ 15 წუთში წაიკითხავს და დაკავებულ დღეებს ავტომატურად დაბლოკავს — ორმაგი ჯავშანი აღარ მოხდება. ბმული ასევე შეგიძლიათ ჩასვათ მანქანის რედაქტირების გვერდზე.",
  icalLabel: "iCal Import Link (გარე კალენდრის ბმული)",
  icalPlaceholder: "https://…/calendar.ics",
  icalFieldHint: "ჩასვით თქვენი გარე ჩანელ მენეჯერის (მაგ. Booking, Airbnb, Localrent) iCal (.ics) ბმული",
  syncNow: "სინქრონიზაცია ახლავე",
  syncing: "სინქრონიზაცია…",
  lastSync: "ბოლო სინქრონიზაცია",
  synced: "სინქრონიზებულია",
  notSynced: "ჯერ არ სინქრონიზებულა",
  busyDays: "დაბლოკილი პერიოდი",
  remove: "ბმულის მოხსნა",
  saveCarFirst: "გარე კალენდრის მისაბმელად ჯერ შეინახეთ მანქანა.",
  empty: "ავტოპარკში მანქანა ჯერ არ არის.",
  loading: "იტვირთება…",
  loadError: "ვერ ჩაიტვირთა. სცადეთ თავიდან.",
  copy: "კოპირება",
  copied: "დაკოპირდა",
};

export type IntegrationCopy = typeof ka;

const en: IntegrationCopy = {
  importTab: "Inbound integration (Import)",
  exportTab: "Outbound integration (Export)",
  apiTitle: "API Integrations & Webhooks",
  apiHint: "With an API key your channel manager or website can update car availability and prices automatically.",
  apiKey: "API key",
  noKey: "No key yet.",
  generate: "Generate API Key",
  regenerate: "Generate new key",
  regenerateConfirm: "A new key revokes the current one. Systems using the old key will stop working. Continue?",
  newKeyNotice: "Save this key now — for security it is shown only once.",
  keyCreated: "Created",
  lastUsed: "Last used",
  never: "never",
  baseUrl: "API base URL",
  webhookUrl: "Partner Webhook URL",
  webhookHint: "We send a POST to this address when a booking is created, confirmed, changed or cancelled.",
  webhookPlaceholder: "https://your-system.com/webhooks/rentairportcars",
  webhookSecret: "Webhook secret (for signatures)",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  test: "Send test",
  testOk: "Test webhook delivered",
  testFail: "Test webhook was not delivered",
  webhookInvalid: "Use a public https address.",
  docs: "API documentation",
  icalTitle: "Global iCal Sync Settings",
  icalHint:
    "Attach an external calendar (.ics) link to each car. We read it every 15 minutes and block busy dates automatically, so double bookings cannot happen. You can also paste the link on the car's edit page.",
  icalLabel: "iCal Import Link",
  icalPlaceholder: "https://…/calendar.ics",
  icalFieldHint: "Paste the iCal (.ics) link from your channel manager (e.g. Booking, Airbnb, Localrent)",
  syncNow: "Sync Now",
  syncing: "Syncing…",
  lastSync: "Last sync",
  synced: "Synced",
  notSynced: "Not synced yet",
  busyDays: "busy period(s)",
  remove: "Remove link",
  saveCarFirst: "Save the car first to connect an external calendar.",
  empty: "No cars in your fleet yet.",
  loading: "Loading…",
  loadError: "Could not load. Please try again.",
  copy: "Copy",
  copied: "Copied",
};

const ru: IntegrationCopy = {
  ...en,
  importTab: "Входящая интеграция (Import)",
  exportTab: "Исходящая интеграция (Export)",
  apiTitle: "API-интеграция и вебхуки",
  apiHint: "С API-ключом ваш channel manager или сайт сам обновляет свободные дни и цены машин.",
  apiKey: "API-ключ",
  noKey: "Ключа пока нет.",
  generate: "Создать API-ключ",
  regenerate: "Создать новый ключ",
  regenerateConfirm: "Новый ключ отменит текущий. Системы со старым ключом перестанут работать. Продолжить?",
  newKeyNotice: "Сохраните ключ сейчас — из соображений безопасности он показывается один раз.",
  keyCreated: "Создан",
  lastUsed: "Последнее использование",
  never: "ещё нет",
  baseUrl: "Адрес API",
  webhookHint: "Отправим POST на этот адрес, когда бронь создана, подтверждена, изменена или отменена.",
  webhookSecret: "Секрет вебхука (для подписи)",
  save: "Сохранить",
  saving: "Сохранение…",
  saved: "Сохранено",
  test: "Тестовая отправка",
  testOk: "Тестовый вебхук доставлен",
  testFail: "Тестовый вебхук не доставлен",
  webhookInvalid: "Нужен публичный https-адрес.",
  docs: "Документация API",
  icalTitle: "Настройки синхронизации iCal",
  icalHint:
    "Привяжите к каждой машине ссылку на внешний календарь (.ics). Мы читаем его каждые 15 минут и закрываем занятые дни — двойных броней не будет. Ссылку можно вставить и на странице редактирования машины.",
  icalLabel: "Ссылка iCal для импорта",
  icalFieldHint: "Вставьте iCal (.ics) ссылку из вашего channel manager (например Booking, Airbnb, Localrent)",
  syncNow: "Синхронизировать",
  syncing: "Синхронизация…",
  lastSync: "Последняя синхронизация",
  synced: "Синхронизировано",
  notSynced: "Ещё не синхронизировано",
  busyDays: "занятых периодов",
  remove: "Убрать ссылку",
  saveCarFirst: "Сначала сохраните машину, затем подключите календарь.",
  empty: "В автопарке пока нет машин.",
  loading: "Загрузка…",
  loadError: "Не удалось загрузить. Попробуйте снова.",
  copy: "Копировать",
  copied: "Скопировано",
};

const COPY: Record<string, IntegrationCopy> = { ka, en, ru };

export function integrationCopy(locale: string): IntegrationCopy {
  return COPY[locale] ?? en;
}

export function formatSyncTime(iso: string | null, locale: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(locale === "ka" ? "ka-GE" : locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}
