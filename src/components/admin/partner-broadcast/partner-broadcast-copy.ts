export type PartnerBroadcastCopy = {
  selectAll: string;
  selected: string;
  hint: string;
  sendMessage: string;
  clear: string;
  title: string;
  recipients: string;
  textLabel: string;
  textPlaceholder: string;
  channels: string;
  autoHint: string;
  telegram: string;
  email: string;
  sms: string;
  smsOff: string;
  reachable: string;
  send: string;
  sending: string;
  loading: string;
  close: string;
  doneTitle: string;
  sentOf: string;
  failedFor: string;
  noChannel: string;
  errorText: string;
  errorGeneric: string;
  messengersTitle: string;
  messengersHint: string;
  writeFirst: string;
  nextWhatsapp: string;
  nextViber: string;
  progress: string;
  allOpened: string;
  resetProgress: string;
  noPhone: string;
  copied: string;
};

const ka: PartnerBroadcastCopy = {
  selectAll: "ყველა ნომრის მონიშვნა",
  selected: "მონიშნულია {n} ნომერი",
  hint: "მონიშნეთ ტელეფონის ნომრები სიაში. ერთი ტექსტი თითოეულ მონიშნულ ნომერზე ცალ-ცალკე გაიგზავნება (WhatsApp / Viber).",
  sendMessage: "შეტყობინების გაგზავნა",
  clear: "მოხსნა",
  title: "შეტყობინება მონიშნულ ნომრებზე",
  recipients: "მიმღები: {n} ნომერი — თითოეულს ცალ-ცალკე მიუვა",
  textLabel: "ტექსტი",
  textPlaceholder: "ჩაწერეთ შეტყობინება ერთხელ — ყველა მონიშნულს ეს ტექსტი გაეგზავნება…",
  channels: "ავტომატური გაგზავნა (Telegram ბოტი / ელ. ფოსტა / SMS)",
  autoHint: "სერვერი ერთი ღილაკით უგზავნის ყველას, ვისაც ეს არხი აქვს.",
  telegram: "Telegram ბოტი",
  email: "ელ. ფოსტა",
  sms: "SMS",
  smsOff: "SMS არ არის დაკავშირებული (საჭიროა smsoffice.ge-ის გასაღები)",
  reachable: "{n} / {total}",
  send: "ავტომატურად გაგზავნა",
  sending: "იგზავნება…",
  loading: "კონტაქტები იტვირთება…",
  close: "დახურვა",
  doneTitle: "გაგზავნილია",
  sentOf: "{channel}: {sent} / {total}",
  failedFor: "ვერ მიუვიდა:",
  noChannel: "აირჩიეთ მინიმუმ ერთი არხი.",
  errorText: "ჩაწერეთ ტექსტი (მაქს. 2000 სიმბოლო).",
  errorGeneric: "გაგზავნა ვერ მოხერხდა. სცადეთ თავიდან.",
  messengersTitle: "WhatsApp / Viber — თითოეულს ცალ-ცალკე",
  messengersHint:
    "ღილაკზე დაჭერით იხსნება ჩატი ამ პარტნიორთან უკვე ჩაწერილი ტექსტით — დააჭირეთ „გაგზავნას“ მესენჯერში. Viber-ისთვის ტექსტი კოპირდებაც, თუ ჩატში არ ჩაისვა.",
  writeFirst: "ჯერ ჩაწერეთ ტექსტი, შემდეგ გახსენით ჩატები.",
  nextWhatsapp: "შემდეგი WhatsApp ({n} დარჩა)",
  nextViber: "შემდეგი Viber ({n} დარჩა)",
  progress: "გახსნილია: WhatsApp {wa} / {total} · Viber {viber} / {total}",
  allOpened: "ყველა ჩატი გახსნილია",
  resetProgress: "ნიშნების გასუფთავება",
  noPhone: "ნომერი არ არის — გამოტოვებულია",
  copied: "ტექსტი დაკოპირდა",
};

const ru: PartnerBroadcastCopy = {
  selectAll: "Выбрать все номера",
  selected: "Выбрано номеров: {n}",
  hint: "Отметьте номера в списке. Один текст уйдёт каждому выбранному номеру отдельно (WhatsApp / Viber).",
  sendMessage: "Отправить сообщение",
  clear: "Снять",
  title: "Сообщение на выбранные номера",
  recipients: "Получатели: {n} номеров — каждому отдельно",
  textLabel: "Текст",
  textPlaceholder: "Напишите сообщение один раз — его получит каждый выбранный…",
  channels: "Автоматическая отправка (Telegram-бот / Email / SMS)",
  autoHint: "Сервер отправит одним нажатием всем, у кого есть этот канал.",
  telegram: "Telegram-бот",
  email: "Email",
  sms: "SMS",
  smsOff: "SMS не подключены (нужен ключ smsoffice.ge)",
  reachable: "{n} / {total}",
  send: "Отправить автоматически",
  sending: "Отправка…",
  loading: "Загрузка контактов…",
  close: "Закрыть",
  doneTitle: "Отправлено",
  sentOf: "{channel}: {sent} / {total}",
  failedFor: "Не доставлено:",
  noChannel: "Выберите хотя бы один канал.",
  errorText: "Введите текст (макс. 2000 символов).",
  errorGeneric: "Не удалось отправить. Попробуйте снова.",
  messengersTitle: "WhatsApp / Viber — каждому отдельно",
  messengersHint:
    "Кнопка открывает чат с партнёром с уже вставленным текстом — нажмите «Отправить» в мессенджере. Для Viber текст ещё и копируется, если он не вставился.",
  writeFirst: "Сначала напишите текст, затем открывайте чаты.",
  nextWhatsapp: "Следующий WhatsApp (осталось {n})",
  nextViber: "Следующий Viber (осталось {n})",
  progress: "Открыто: WhatsApp {wa} / {total} · Viber {viber} / {total}",
  allOpened: "Все чаты открыты",
  resetProgress: "Сбросить отметки",
  noPhone: "Нет номера — пропущен",
  copied: "Текст скопирован",
};

const en: PartnerBroadcastCopy = {
  selectAll: "Select all numbers",
  selected: "{n} numbers selected",
  hint: "Check the phone numbers in the list. One text is sent separately to each selected number (WhatsApp / Viber).",
  sendMessage: "Send message",
  clear: "Clear",
  title: "Message the selected numbers",
  recipients: "Recipients: {n} numbers — each gets its own message",
  textLabel: "Text",
  textPlaceholder: "Write the message once — every selected number gets this text…",
  channels: "Automatic sending (Telegram bot / email / SMS)",
  autoHint: "The server sends it in one click to everyone who has that channel.",
  telegram: "Telegram bot",
  email: "Email",
  sms: "SMS",
  smsOff: "SMS is not connected (smsoffice.ge key required)",
  reachable: "{n} / {total}",
  send: "Send automatically",
  sending: "Sending…",
  loading: "Loading contacts…",
  close: "Close",
  doneTitle: "Sent",
  sentOf: "{channel}: {sent} / {total}",
  failedFor: "Not delivered:",
  noChannel: "Choose at least one channel.",
  errorText: "Enter the text (max 2000 characters).",
  errorGeneric: "Sending failed. Please try again.",
  messengersTitle: "WhatsApp / Viber — one by one",
  messengersHint:
    "Each button opens a chat with that partner with the text already filled in — press Send in the messenger. For Viber the text is also copied in case it is not prefilled.",
  writeFirst: "Write the text first, then open the chats.",
  nextWhatsapp: "Next WhatsApp ({n} left)",
  nextViber: "Next Viber ({n} left)",
  progress: "Opened: WhatsApp {wa} / {total} · Viber {viber} / {total}",
  allOpened: "All chats opened",
  resetProgress: "Reset marks",
  noPhone: "No phone — skipped",
  copied: "Text copied",
};

export function partnerBroadcastCopy(locale: string): PartnerBroadcastCopy {
  if (locale === "ka") return ka;
  if (locale === "ru") return ru;
  return en;
}
