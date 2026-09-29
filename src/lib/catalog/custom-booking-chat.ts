export const CUSTOM_BOOKING_CODE_PREFIX = "11R";
export const CUSTOM_BOOKING_CODE_START = 1000;
/** Offline / chat-linked marketplace booking refs (same style as formatBookingRef). */
export const CHAT_BOOKING_REF_START = 1000;

export type CustomBookingMessageSender = "GUEST" | "ADMIN";

export type CustomBookingChatStatus =
  | "OPEN"
  | "ACTIVE"
  | "REJECTED"
  | "COMPLETED"
  | "CLOSED";

export type CustomBookingChannelUsed = "online" | "whatsapp" | "viber" | "telegram";

export type CustomBookingMessage = {
  id: string;
  sender: CustomBookingMessageSender;
  body: string;
  createdAt: string;
  readByAdmin: boolean;
  readByGuest: boolean;
  imageUrl?: string;
  carOffer?: boolean;
};

export type CustomBookingChat = {
  id: string;
  code: string;
  sequentialNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryIso2: string;
  channel: CustomBookingChannelUsed;
  status: CustomBookingChatStatus;
  carPhotos: string[];
  selectedCarImageUrl: string | null;
  selectedCarNote: string;
  bookingNote: string;
  pickupAt: string | null;
  dropoffAt: string | null;
  partnerListingId: string | null;
  partnerListingLabel: string;
  bookingRef: string | null;
  bookingSequentialNumber: number | null;
  priceEur: number | null;
  commissionPercent: number | null;
  activatedAt: string | null;
  rejectedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messages: CustomBookingMessage[];
};

export function formatCustomBookingCode(sequentialNumber: number): string {
  return `${CUSTOM_BOOKING_CODE_PREFIX}${sequentialNumber}`;
}

export function parseCustomBookingCode(raw: string): string | null {
  const cleaned = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  // 11R1000+ (current), legacy RE-10000+ / AB-1000+
  const match = cleaned.match(/^(?:11R-?|RE-?|AB-?)(\d{3,})$/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n < 1) return null;
  return formatCustomBookingCode(n);
}

export function unreadAdminCount(chat: CustomBookingChat): number {
  return chat.messages.filter((m) => m.sender === "GUEST" && !m.readByAdmin).length;
}

export function unreadGuestCount(chat: CustomBookingChat): number {
  return chat.messages.filter((m) => m.sender === "ADMIN" && !m.readByGuest).length;
}

export function normalizeCustomBookingChat(raw: Partial<CustomBookingChat> & { id: string }): CustomBookingChat {
  const status = (raw.status as CustomBookingChatStatus) || "OPEN";
  const channel = (raw.channel as CustomBookingChannelUsed) || "online";
  return {
    id: raw.id,
    code: String(raw.code || ""),
    sequentialNumber: Number(raw.sequentialNumber) || CUSTOM_BOOKING_CODE_START,
    firstName: String(raw.firstName || ""),
    lastName: String(raw.lastName || ""),
    email: String(raw.email || ""),
    phone: String(raw.phone || ""),
    phoneCountryIso2: String(raw.phoneCountryIso2 || "GE").toUpperCase(),
    channel: ["online", "whatsapp", "viber", "telegram"].includes(channel) ? channel : "online",
    status: ["OPEN", "ACTIVE", "REJECTED", "COMPLETED", "CLOSED"].includes(status) ? status : "OPEN",
    carPhotos: Array.isArray(raw.carPhotos) ? raw.carPhotos.map(String) : [],
    selectedCarImageUrl: raw.selectedCarImageUrl ? String(raw.selectedCarImageUrl) : null,
    selectedCarNote: String(raw.selectedCarNote || ""),
    bookingNote: String(raw.bookingNote || ""),
    pickupAt: raw.pickupAt ? String(raw.pickupAt) : null,
    dropoffAt: raw.dropoffAt ? String(raw.dropoffAt) : null,
    partnerListingId: raw.partnerListingId ? String(raw.partnerListingId) : null,
    partnerListingLabel: String(raw.partnerListingLabel || ""),
    bookingRef: raw.bookingRef ? String(raw.bookingRef) : null,
    bookingSequentialNumber:
      raw.bookingSequentialNumber != null && Number.isFinite(Number(raw.bookingSequentialNumber))
        ? Number(raw.bookingSequentialNumber)
        : null,
    priceEur: raw.priceEur != null && Number.isFinite(Number(raw.priceEur)) ? Number(raw.priceEur) : null,
    commissionPercent:
      raw.commissionPercent != null && Number.isFinite(Number(raw.commissionPercent))
        ? Number(raw.commissionPercent)
        : null,
    activatedAt: raw.activatedAt ? String(raw.activatedAt) : null,
    rejectedAt: raw.rejectedAt ? String(raw.rejectedAt) : null,
    completedAt: raw.completedAt ? String(raw.completedAt) : null,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
    lastMessageAt: String(raw.lastMessageAt || raw.updatedAt || new Date().toISOString()),
    messages: Array.isArray(raw.messages)
      ? raw.messages.map((m) => ({
          id: String(m.id),
          sender: m.sender === "ADMIN" ? "ADMIN" : "GUEST",
          body: String(m.body || ""),
          createdAt: String(m.createdAt || ""),
          readByAdmin: Boolean(m.readByAdmin),
          readByGuest: Boolean(m.readByGuest),
          imageUrl: m.imageUrl ? String(m.imageUrl) : undefined,
          carOffer: Boolean(m.carOffer),
        }))
      : [],
  };
}
