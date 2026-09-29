export type CustomBookingChannelKey = "online" | "whatsapp" | "viber" | "telegram";

export type CustomBookingChannel = {
  enabled: boolean;
  /**
   * Contact for deep-link (ignored for online chat):
   * - WhatsApp / Viber: international phone (digits, with country code), e.g. 995555000000
   * - Telegram: @username or phone digits
   * Legacy `url` values (https://…) are still accepted and used as-is.
   */
  contact: string;
};

export type CustomBookingChannelsConfig = {
  online: CustomBookingChannel;
  whatsapp: CustomBookingChannel;
  viber: CustomBookingChannel;
  telegram: CustomBookingChannel;
  updatedAt: string;
};

export const DEFAULT_CUSTOM_BOOKING_CHANNELS: CustomBookingChannelsConfig = {
  online: { enabled: true, contact: "" },
  whatsapp: { enabled: false, contact: "" },
  viber: { enabled: false, contact: "" },
  telegram: { enabled: false, contact: "" },
  updatedAt: new Date(0).toISOString(),
};

export const CUSTOM_BOOKING_CHANNEL_KEYS: CustomBookingChannelKey[] = [
  "online",
  "whatsapp",
  "viber",
  "telegram",
];

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function enabledCustomBookingChannels(config: CustomBookingChannelsConfig): CustomBookingChannelKey[] {
  return CUSTOM_BOOKING_CHANNEL_KEYS.filter((key) => config[key].enabled);
}

/** Build WhatsApp chat URL from admin contact (phone) or full URL. */
export function buildWhatsAppBookingHref(contact: string, message: string, fallbackNumber: string) {
  const raw = contact.trim();
  if (/^https?:\/\//i.test(raw) || /^whatsapp:/i.test(raw)) return raw;
  const phone = digitsOnly(raw) || digitsOnly(fallbackNumber);
  if (!phone) return "/contact";
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/** Build Viber chat URL — never WhatsApp. */
export function buildViberBookingHref(contact: string) {
  const raw = contact.trim();
  if (!raw) return "/contact";
  if (/^https?:\/\//i.test(raw) || /^viber:/i.test(raw)) return raw;
  const phone = digitsOnly(raw);
  if (!phone) return "/contact";
  // Viber expects + and country code in the number param
  return `viber://chat?number=%2B${phone}`;
}

/** Build Telegram open URL from @username, phone, or full URL. */
export function buildTelegramBookingHref(contact: string) {
  const raw = contact.trim();
  if (!raw) return "/contact";
  if (/^https?:\/\//i.test(raw) || /^tg:/i.test(raw)) return raw;
  if (raw.startsWith("@")) return `https://t.me/${raw.slice(1)}`;
  if (/^[A-Za-z][\w\d_]{3,}$/.test(raw)) return `https://t.me/${raw}`;
  const phone = digitsOnly(raw);
  if (phone) return `tg://resolve?phone=${phone}`;
  return "/contact";
}

export function buildCustomBookingChannelHref(
  key: Exclude<CustomBookingChannelKey, "online">,
  contact: string,
  message: string,
  fallbackWhatsApp: string,
) {
  if (key === "whatsapp") return buildWhatsAppBookingHref(contact, message, fallbackWhatsApp);
  if (key === "viber") return buildViberBookingHref(contact);
  return buildTelegramBookingHref(contact);
}
