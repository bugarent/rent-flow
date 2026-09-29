export const SITE_NAME = "rentairportcars.com";
export const SITE_DOMAIN = "rentairportcars.com";

/** Public support email — used by contact modal / mailto when footer config is unavailable. */
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "info@rentairportcars.com";

export const HERO_BACKGROUND_URL = "/images/hero-tarmac.jpg?v=6";
export const MANAGE_BOOKING_BACKDROP_URL = "/images/manage-booking-backdrop.jpg?v=2";
/** Partner “Create auto” page — airport + rental cars, brand-associated. */
export const CREATE_AUTO_BACKDROP_URL = "/images/create-auto-backdrop.jpg?v=3";

export const DEFAULT_GOOGLE_MAPS_URL =
  "https://maps.google.com/?q=Kutaisi+International+Airport";

/** Admin WhatsApp for custom bookings / lead generation. Override with NEXT_PUBLIC_WHATSAPP_NUMBER (digits only, country code). */
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "995555000000";

export const WHATSAPP_CUSTOM_BOOKING_TEXT =
  "Hello! I need a custom car & driver booking on rentairportcars.com";

export const WHATSAPP_SUPPORT_TEXT =
  "Hello! I need support with an airport car rental on rentairportcars.com";

export function whatsappUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const BOOKING_BUFFER_HOURS = 12;
export const MIN_PUBLIC_PHOTOS = 5;
export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const DEPOSIT_MIN_PERCENT = 0;
export const DEPOSIT_MAX_PERCENT = 20;
