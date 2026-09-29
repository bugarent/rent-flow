import type { Locale } from "@/lib/i18n/config";
import type {
  ContactRequestSubtypeId,
  ContactRequestTypeId,
} from "@/lib/catalog/contact-message";

export type ContactFormCopy = {
  title: string;
  yourEmail: string;
  requestType: string;
  subtype: string;
  bookingNumber: string;
  bookingNumberHint: string;
  subject: string;
  description: string;
  attach: string;
  attachTooLarge: string;
  cancel: string;
  send: string;
  sending: string;
  selectOption: string;
  sent: string;
  failed: string;
  types: Record<ContactRequestTypeId, string>;
  subtypes: Record<ContactRequestSubtypeId, string>;
};

const en: ContactFormCopy = {
  title: "Send message",
  yourEmail: "Your email",
  requestType: "Request type",
  subtype: "Subtype",
  bookingNumber: "Booking number",
  bookingNumberHint: "Enter the booking reference from your confirmation email or voucher.",
  subject: "Subject",
  description: "Description",
  attach: "Attach",
  attachTooLarge: "Attachment is too large (max 5 MB).",
  cancel: "Cancel",
  send: "Send",
  sending: "Sending…",
  selectOption: "Select an option",
  sent: "Your message was sent. We will get back to you soon.",
  failed: "Could not send the message. Please try again.",
  types: {
    booking: "Booking",
    payment: "Payment",
    cancel: "Cancellation",
    account: "Account",
    other: "Other",
  },
  subtypes: {
    booking_info: "Booking information",
    booking_change: "Change booking",
    booking_issue: "Problem with booking",
    payment_deposit: "Deposit / payment",
    payment_refund: "Refund",
    cancel_request: "Cancel booking",
    cancel_policy: "Cancellation policy",
    account_login: "Login / access",
    account_data: "Personal data",
    other_general: "General question",
  },
};

const ka: ContactFormCopy = {
  title: "შეტყობინების გაგზავნა",
  yourEmail: "თქვენი ელ. ფოსტა",
  requestType: "მოთხოვნის ტიპი",
  subtype: "ქვეტიპი",
  bookingNumber: "ჯავშნის ნომერი",
  bookingNumberHint: "შეიყვანეთ ჯავშნის ნომერი დადასტურების წერილიდან ან ვაუჩერიდან.",
  subject: "თემა",
  description: "აღწერა",
  attach: "დამაგრება",
  attachTooLarge: "ფაილი ძალიან დიდია (მაქს. 5 მბ).",
  cancel: "გაუქმება",
  send: "გაგზავნა",
  sending: "იგზავნება…",
  selectOption: "აირჩიეთ ვარიანტი",
  sent: "შეტყობინება გაიგზავნა. მალე გიპასუხებთ.",
  failed: "შეტყობინების გაგზავნა ვერ მოხერხდა. სცადეთ თავიდან.",
  types: {
    booking: "ჯავშანი",
    payment: "გადახდა",
    cancel: "გაუქმება",
    account: "ანგარიში",
    other: "სხვა",
  },
  subtypes: {
    booking_info: "ჯავშნის ინფორმაცია",
    booking_change: "ჯავშნის ცვლილება",
    booking_issue: "პრობლემა ჯავშანთან",
    payment_deposit: "დეპოზიტი / გადახდა",
    payment_refund: "თანხის დაბრუნება",
    cancel_request: "ჯავშნის გაუქმება",
    cancel_policy: "გაუქმების პირობები",
    account_login: "შესვლა / წვდომა",
    account_data: "პერსონალური მონაცემები",
    other_general: "ზოგადი კითხვა",
  },
};

const ru: ContactFormCopy = {
  ...en,
  title: "Отправить сообщение",
  yourEmail: "Ваш e-mail",
  requestType: "Тип запроса",
  subtype: "Подтип",
  bookingNumber: "Номер бронирования",
  bookingNumberHint: "Укажите номер бронирования из письма подтверждения или ваучера.",
  subject: "Тема",
  description: "Описание",
  attach: "Прикрепить",
  attachTooLarge: "Файл слишком большой (макс. 5 МБ).",
  cancel: "Отмена",
  send: "Отправить",
  sending: "Отправка…",
  selectOption: "Выберите вариант",
  sent: "Сообщение отправлено. Мы скоро ответим.",
  failed: "Не удалось отправить сообщение. Попробуйте снова.",
  types: {
    booking: "Бронирование",
    payment: "Оплата",
    cancel: "Отмена",
    account: "Аккаунт",
    other: "Другое",
  },
  subtypes: {
    booking_info: "Информация о бронировании",
    booking_change: "Изменить бронирование",
    booking_issue: "Проблема с бронированием",
    payment_deposit: "Депозит / оплата",
    payment_refund: "Возврат",
    cancel_request: "Отменить бронирование",
    cancel_policy: "Условия отмены",
    account_login: "Вход / доступ",
    account_data: "Персональные данные",
    other_general: "Общий вопрос",
  },
};

const byLocale: Partial<Record<Locale, ContactFormCopy>> = { en, ka, ru };

export function getContactFormCopy(locale: Locale): ContactFormCopy {
  return byLocale[locale] ?? en;
}
