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
  noPhone: string;
  copied: string;
};

const ka: PartnerBroadcastCopy = {
  selectAll: "ყველა ნომრის მონიშვნა",
  selected: "მონიშნულია {n} ნომერი",
  hint: "მონიშნეთ ტელეფონის ნომრები სიაში. ერთი ტექსტი თითოეულ მონიშნულ ნომერზე ცალ-ცალკე გაიგზავნება.",
  sendMessage: "შეტყობინების გაგზავნა",
  clear: "მოხსნა",
  title: "შეტყობინება მონიშნულ ნომრებზე",
  recipients: "მიმღები: {n} ნომერი — თითოეულს ცალ-ცალკე მიუვა",
  textLabel: "ტექსტი",
  textPlaceholder: "ჩაწერეთ შეტყობინება…",
  channels: "გაგზავნის არხები",
  telegram: "Telegram ბოტი",
  email: "ელ. ფოსტა",
  sms: "SMS",
  smsOff: "SMS არ არის დაკავშირებული (საჭიროა smsoffice.ge-ის გასაღები)",
  reachable: "{n} / {total}",
  send: "გაგზავნა",
  sending: "იგზავნება…",
  loading: "კონტაქტები იტვირთება…",
  close: "დახურვა",
  doneTitle: "გაგზავნილია",
  sentOf: "{channel}: {sent} / {total}",
  failedFor: "ვერ მიუვიდა:",
  noChannel: "აირჩიეთ მინიმუმ ერთი არხი.",
  errorText: "ჩაწერეთ ტექსტი (მაქს. 2000 სიმბოლო).",
  errorGeneric: "გაგზავნა ვერ მოხერხდა. სცადეთ თავიდან.",
  messengersTitle: "WhatsApp / Viber",
  messengersHint: "თითოეულზე იხსნება ჩატი; WhatsApp-ში ტექსტი უკვე ჩაწერილია, Viber-ისთვის ტექსტი კოპირდება — ჩასვით და გაგზავნეთ.",
  noPhone: "ნომერი არ არის",
  copied: "ტექსტი დაკოპირდა",
};

const ru: PartnerBroadcastCopy = {
  selectAll: "Выбрать все номера",
  selected: "Выбрано номеров: {n}",
  hint: "Отметьте номера в списке. Один текст уйдёт каждому выбранному номеру отдельно.",
  sendMessage: "Отправить сообщение",
  clear: "Снять",
  title: "Сообщение на выбранные номера",
  recipients: "Получатели: {n} номеров — каждому отдельно",
  textLabel: "Текст",
  textPlaceholder: "Введите сообщение…",
  channels: "Каналы отправки",
  telegram: "Telegram-бот",
  email: "Email",
  sms: "SMS",
  smsOff: "SMS не подключены (нужен ключ smsoffice.ge)",
  reachable: "{n} / {total}",
  send: "Отправить",
  sending: "Отправка…",
  loading: "Загрузка контактов…",
  close: "Закрыть",
  doneTitle: "Отправлено",
  sentOf: "{channel}: {sent} / {total}",
  failedFor: "Не доставлено:",
  noChannel: "Выберите хотя бы один канал.",
  errorText: "Введите текст (макс. 2000 символов).",
  errorGeneric: "Не удалось отправить. Попробуйте снова.",
  messengersTitle: "WhatsApp / Viber",
  messengersHint: "Открывается чат с каждым; в WhatsApp текст уже вставлен, для Viber текст копируется — вставьте и отправьте.",
  noPhone: "Нет номера",
  copied: "Текст скопирован",
};

const en: PartnerBroadcastCopy = {
  selectAll: "Select all numbers",
  selected: "{n} numbers selected",
  hint: "Check the phone numbers in the list. One text is sent separately to each selected number.",
  sendMessage: "Send message",
  clear: "Clear",
  title: "Message the selected numbers",
  recipients: "Recipients: {n} numbers — each gets its own message",
  textLabel: "Text",
  textPlaceholder: "Write your message…",
  channels: "Channels",
  telegram: "Telegram bot",
  email: "Email",
  sms: "SMS",
  smsOff: "SMS is not connected (smsoffice.ge key required)",
  reachable: "{n} / {total}",
  send: "Send",
  sending: "Sending…",
  loading: "Loading contacts…",
  close: "Close",
  doneTitle: "Sent",
  sentOf: "{channel}: {sent} / {total}",
  failedFor: "Not delivered:",
  noChannel: "Choose at least one channel.",
  errorText: "Enter the text (max 2000 characters).",
  errorGeneric: "Sending failed. Please try again.",
  messengersTitle: "WhatsApp / Viber",
  messengersHint: "Opens a chat with each partner; WhatsApp gets the text prefilled, for Viber the text is copied — paste and send.",
  noPhone: "No phone",
  copied: "Text copied",
};

export function partnerBroadcastCopy(locale: string): PartnerBroadcastCopy {
  if (locale === "ka") return ka;
  if (locale === "ru") return ru;
  return en;
}
