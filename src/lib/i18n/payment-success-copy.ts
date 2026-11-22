import type { Locale } from "@/lib/i18n/config";
import { isLocale } from "@/lib/i18n/config";

export type PaymentSuccessCopy = {
  title: string;
  body: string;
  emailLabel: string;
  bookingLabel: string;
  remember: string;
  home: string;
  support: string;
};

const COPY: Record<Locale, PaymentSuccessCopy> = {
  en: {
    title: "Booking activated",
    body: "Your booking is activated. Detailed information will be sent to the email you entered.",
    emailLabel: "Your email",
    bookingLabel: "Booking number",
    remember: "Remember this: keep the email and the booking number.",
    home: "Back to home",
    support: "Contact support",
  },
  ka: {
    title: "ჯავშანი გააქტიურებულია",
    body: "თქვენი ჯავშანი გააქტიურებულია. დეტალურ ინფორმაციას მიიღებთ მითითებულ ელფოსტაზე.",
    emailLabel: "თქვენი ელფოსტა",
    bookingLabel: "ჯავშნის ნომერი",
    remember: "დაიმახსოვრეთ: შეინახეთ მაილი და ჯავშნის ნომერი.",
    home: "მთავარზე დაბრუნება",
    support: "დახმარება",
  },
  de: {
    title: "Buchung aktiviert",
    body: "Ihre Buchung ist aktiviert. Die ausführlichen Informationen senden wir an die angegebene E-Mail.",
    emailLabel: "Ihre E-Mail",
    bookingLabel: "Buchungsnummer",
    remember: "Bitte merken: E-Mail und Buchungsnummer aufbewahren.",
    home: "Zur Startseite",
    support: "Support kontaktieren",
  },
  es: {
    title: "Reserva activada",
    body: "Su reserva está activada. Recibirá la información detallada en el correo que indicó.",
    emailLabel: "Su correo",
    bookingLabel: "Número de reserva",
    remember: "Guarde el correo y el número de reserva.",
    home: "Volver al inicio",
    support: "Contactar soporte",
  },
  fr: {
    title: "Réservation activée",
    body: "Votre réservation est activée. Les informations détaillées seront envoyées à l’e-mail indiqué.",
    emailLabel: "Votre e-mail",
    bookingLabel: "Numéro de réservation",
    remember: "Conservez l’e-mail et le numéro de réservation.",
    home: "Retour à l’accueil",
    support: "Contacter le support",
  },
  it: {
    title: "Prenotazione attivata",
    body: "La prenotazione è attivata. I dettagli saranno inviati all’e-mail indicata.",
    emailLabel: "La sua e-mail",
    bookingLabel: "Numero di prenotazione",
    remember: "Conservi l’e-mail e il numero di prenotazione.",
    home: "Torna alla home",
    support: "Contatta l’assistenza",
  },
  nl: {
    title: "Boeking geactiveerd",
    body: "Uw boeking is geactiveerd. De details sturen we naar het opgegeven e-mailadres.",
    emailLabel: "Uw e-mail",
    bookingLabel: "Boekingsnummer",
    remember: "Bewaar het e-mailadres en het boekingsnummer.",
    home: "Terug naar home",
    support: "Contact opnemen",
  },
  pl: {
    title: "Rezerwacja aktywowana",
    body: "Rezerwacja jest aktywowana. Szczegóły wyślemy na podany e-mail.",
    emailLabel: "Twój e-mail",
    bookingLabel: "Numer rezerwacji",
    remember: "Zachowaj e-mail i numer rezerwacji.",
    home: "Wróć na stronę główną",
    support: "Kontakt z pomocą",
  },
  tr: {
    title: "Rezervasyon etkinleştirildi",
    body: "Rezervasyonunuz etkinleştirildi. Ayrıntılı bilgi belirttiğiniz e-postaya gelecek.",
    emailLabel: "E-postanız",
    bookingLabel: "Rezervasyon numarası",
    remember: "E-postayı ve rezervasyon numarasını saklayın.",
    home: "Ana sayfaya dön",
    support: "Destekle iletişim",
  },
  ru: {
    title: "Бронь активирована",
    body: "Ваша бронь активирована. Подробную информацию вы получите на указанную почту.",
    emailLabel: "Ваша почта",
    bookingLabel: "Номер брони",
    remember: "Сохраните почту и номер брони.",
    home: "На главную",
    support: "Написать в поддержку",
  },
  ar: {
    title: "تم تفعيل الحجز",
    body: "تم تفعيل حجزك. ستصلك التفاصيل على البريد الذي أدخلته.",
    emailLabel: "بريدك الإلكتروني",
    bookingLabel: "رقم الحجز",
    remember: "احتفظ بالبريد ورقم الحجز.",
    home: "العودة إلى الرئيسية",
    support: "التواصل مع الدعم",
  },
  zh: {
    title: "预订已生效",
    body: "您的预订已生效。详细信息将发送到您填写的邮箱。",
    emailLabel: "您的邮箱",
    bookingLabel: "预订编号",
    remember: "请保存邮箱和预订编号。",
    home: "返回首页",
    support: "联系客服",
  },
  ko: {
    title: "예약이 활성화되었습니다",
    body: "예약이 활성화되었습니다. 자세한 안내는 입력하신 이메일로 보내드립니다.",
    emailLabel: "이메일",
    bookingLabel: "예약 번호",
    remember: "이메일과 예약 번호를 보관해 주세요.",
    home: "홈으로",
    support: "고객 지원",
  },
  th: {
    title: "การจองเปิดใช้งานแล้ว",
    body: "การจองของคุณเปิดใช้งานแล้ว รายละเอียดจะถูกส่งไปยังอีเมลที่ระบุ",
    emailLabel: "อีเมลของคุณ",
    bookingLabel: "หมายเลขการจอง",
    remember: "โปรดเก็บอีเมลและหมายเลขการจองไว้",
    home: "กลับหน้าแรก",
    support: "ติดต่อฝ่ายสนับสนุน",
  },
};

export function paymentSuccessCopy(locale: string): PaymentSuccessCopy {
  return isLocale(locale) ? COPY[locale] : COPY.en;
}
