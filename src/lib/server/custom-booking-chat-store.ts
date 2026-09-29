import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  CHAT_BOOKING_REF_START,
  CUSTOM_BOOKING_CODE_START,
  formatCustomBookingCode,
  normalizeCustomBookingChat,
  parseCustomBookingCode,
  unreadAdminCount,
  type CustomBookingChannelUsed,
  type CustomBookingChat,
  type CustomBookingChatStatus,
  type CustomBookingMessage,
} from "@/lib/catalog/custom-booking-chat";
import { formatBookingRef, parseBookingRef } from "@/lib/ids";

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "custom-booking-chats.json");

type StoreFile = {
  nextSequentialNumber: number;
  nextBookingSequentialNumber: number;
  chats: CustomBookingChat[];
};

function emptyStore(): StoreFile {
  return {
    nextSequentialNumber: CUSTOM_BOOKING_CODE_START,
    nextBookingSequentialNumber: CHAT_BOOKING_REF_START,
    chats: [],
  };
}

/** Next booking number chat activation would use — does not consume it. */
export async function peekNextChatBookingSequential(): Promise<number> {
  const store = await readStore();
  return Math.max(CHAT_BOOKING_REF_START, store.nextBookingSequentialNumber || CHAT_BOOKING_REF_START);
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return {
      nextSequentialNumber:
        Number(parsed.nextSequentialNumber) >= CUSTOM_BOOKING_CODE_START
          ? Number(parsed.nextSequentialNumber)
          : CUSTOM_BOOKING_CODE_START,
      nextBookingSequentialNumber:
        Number(parsed.nextBookingSequentialNumber) >= CHAT_BOOKING_REF_START
          ? Number(parsed.nextBookingSequentialNumber)
          : CHAT_BOOKING_REF_START,
      chats: Array.isArray(parsed.chats)
        ? parsed.chats.map((c) => normalizeCustomBookingChat(c as CustomBookingChat))
        : [],
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: StoreFile) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

function sortForAdmin(chats: CustomBookingChat[]): CustomBookingChat[] {
  return [...chats].sort((a, b) => {
    const aUnread = unreadAdminCount(a) > 0 ? 1 : 0;
    const bUnread = unreadAdminCount(b) > 0 ? 1 : 0;
    if (aUnread !== bUnread) return bUnread - aUnread;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });
}

export async function listCustomBookingChats(): Promise<CustomBookingChat[]> {
  const store = await readStore();
  return sortForAdmin(store.chats);
}

export async function getCustomBookingUnreadTotal(): Promise<number> {
  const chats = await listCustomBookingChats();
  return chats.reduce((sum, chat) => sum + unreadAdminCount(chat), 0);
}

export async function getCustomBookingChatById(id: string): Promise<CustomBookingChat | null> {
  const store = await readStore();
  return store.chats.find((c) => c.id === id) ?? null;
}

export async function getCustomBookingChatByCode(codeRaw: string): Promise<CustomBookingChat | null> {
  const code = parseCustomBookingCode(codeRaw);
  if (!code) return null;
  const store = await readStore();
  const n = Number(String(code).replace(/^(?:11R-?|RE-?|AB-?)/i, ""));
  return (
    store.chats.find(
      (c) =>
        c.code === code ||
        c.sequentialNumber === n ||
        c.code === `AB-${n}` ||
        c.code === `AB${n}`,
    ) ?? null
  );
}

/** Lookup by RE-* / legacy AB-* or booking ref. */
export async function getCustomBookingChatByAnyRef(raw: string): Promise<CustomBookingChat | null> {
  const byCode = await getCustomBookingChatByCode(raw);
  if (byCode) return byCode;
  const seq = parseBookingRef(raw);
  if (seq == null) return null;
  const store = await readStore();
  return (
    store.chats.find((c) => c.bookingSequentialNumber === seq || c.bookingRef === formatBookingRef(seq)) ??
    null
  );
}

export async function createCustomBookingChat(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryIso2: string;
  channel?: CustomBookingChannelUsed;
}): Promise<CustomBookingChat> {
  const store = await readStore();
  const sequentialNumber = store.nextSequentialNumber;
  const now = new Date().toISOString();
  const channel = input.channel || "online";
  const requestNote: CustomBookingMessage = {
    id: randomUUID(),
    sender: "GUEST",
    body: `Custom booking request started by ${input.firstName.trim()} ${input.lastName.trim()}. Phone: ${input.phone.trim()}. Channel: ${channel}.`,
    createdAt: now,
    readByAdmin: false,
    readByGuest: true,
  };
  const welcome: CustomBookingMessage = {
    id: randomUUID(),
    sender: "ADMIN",
    body: `Thanks for contacting Custom Booking Assist. Your tracking code is ${formatCustomBookingCode(sequentialNumber)}. An agent will reply shortly. Use this code with your email in My Booking.`,
    createdAt: now,
    readByAdmin: true,
    readByGuest: true,
  };
  const chat: CustomBookingChat = {
    id: randomUUID(),
    code: formatCustomBookingCode(sequentialNumber),
    sequentialNumber,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.toLowerCase().trim(),
    phone: input.phone.trim(),
    phoneCountryIso2: input.phoneCountryIso2.toUpperCase(),
    channel,
    status: "OPEN",
    carPhotos: [],
    selectedCarImageUrl: null,
    selectedCarNote: "",
    bookingNote: "",
    pickupAt: null,
    dropoffAt: null,
    partnerListingId: null,
    partnerListingLabel: "",
    bookingRef: null,
    bookingSequentialNumber: null,
    priceEur: null,
    commissionPercent: null,
    activatedAt: null,
    rejectedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    messages: [requestNote, welcome],
  };
  store.chats.push(chat);
  store.nextSequentialNumber = sequentialNumber + 1;
  await writeStore(store);
  return chat;
}

export async function addCustomBookingMessage(input: {
  chatId: string;
  sender: "GUEST" | "ADMIN";
  body?: string;
  imageUrl?: string;
  carOffer?: boolean;
}): Promise<CustomBookingChat | null> {
  const store = await readStore();
  const index = store.chats.findIndex((c) => c.id === input.chatId);
  if (index < 0) return null;
  const body = String(input.body || "").trim();
  const imageUrl = input.imageUrl?.trim() || undefined;
  if (!body && !imageUrl) return null;
  const now = new Date().toISOString();
  const message: CustomBookingMessage = {
    id: randomUUID(),
    sender: input.sender,
    body: body || (imageUrl ? "📷 Photo" : ""),
    createdAt: now,
    readByAdmin: input.sender === "ADMIN",
    readByGuest: input.sender === "GUEST",
    imageUrl,
    carOffer: Boolean(input.carOffer && imageUrl),
  };
  const chat = store.chats[index];
  let carPhotos = chat.carPhotos;
  if (input.carOffer && imageUrl && input.sender === "ADMIN" && !carPhotos.includes(imageUrl)) {
    carPhotos = [...carPhotos, imageUrl];
  }
  const next: CustomBookingChat = {
    ...chat,
    carPhotos,
    messages: [...chat.messages, message],
    updatedAt: now,
    lastMessageAt: now,
  };
  store.chats[index] = next;
  await writeStore(store);
  return next;
}

export async function markCustomBookingChatRead(input: {
  chatId: string;
  reader: "ADMIN" | "GUEST";
}): Promise<CustomBookingChat | null> {
  const store = await readStore();
  const index = store.chats.findIndex((c) => c.id === input.chatId);
  if (index < 0) return null;
  const chat = store.chats[index];
  const messages = chat.messages.map((m) => {
    if (input.reader === "ADMIN" && m.sender === "GUEST") {
      return { ...m, readByAdmin: true };
    }
    if (input.reader === "GUEST" && m.sender === "ADMIN") {
      return { ...m, readByGuest: true };
    }
    return m;
  });
  const next = { ...chat, messages, updatedAt: new Date().toISOString() };
  store.chats[index] = next;
  await writeStore(store);
  return next;
}

export async function updateCustomBookingChat(
  id: string,
  patch: Partial<{
    status: CustomBookingChatStatus;
    bookingNote: string;
    selectedCarImageUrl: string | null;
    selectedCarNote: string;
    carPhotos: string[];
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    pickupAt: string | null;
    dropoffAt: string | null;
    partnerListingId: string | null;
    partnerListingLabel: string;
    priceEur: number | null;
    commissionPercent: number | null;
  }>,
): Promise<CustomBookingChat | null> {
  const store = await readStore();
  const index = store.chats.findIndex((c) => c.id === id);
  if (index < 0) return null;
  const chat = store.chats[index];
  const now = new Date().toISOString();
  const next: CustomBookingChat = {
    ...chat,
    ...("firstName" in patch && patch.firstName != null ? { firstName: patch.firstName.trim() } : {}),
    ...("lastName" in patch && patch.lastName != null ? { lastName: patch.lastName.trim() } : {}),
    ...("email" in patch && patch.email != null ? { email: patch.email.toLowerCase().trim() } : {}),
    ...("phone" in patch && patch.phone != null ? { phone: patch.phone.trim() } : {}),
    ...("bookingNote" in patch && patch.bookingNote != null ? { bookingNote: patch.bookingNote } : {}),
    ...("selectedCarNote" in patch && patch.selectedCarNote != null
      ? { selectedCarNote: patch.selectedCarNote }
      : {}),
    ...("selectedCarImageUrl" in patch ? { selectedCarImageUrl: patch.selectedCarImageUrl ?? null } : {}),
    ...("carPhotos" in patch && patch.carPhotos ? { carPhotos: patch.carPhotos } : {}),
    ...("pickupAt" in patch ? { pickupAt: patch.pickupAt ?? null } : {}),
    ...("dropoffAt" in patch ? { dropoffAt: patch.dropoffAt ?? null } : {}),
    ...("partnerListingId" in patch ? { partnerListingId: patch.partnerListingId ?? null } : {}),
    ...("partnerListingLabel" in patch && patch.partnerListingLabel != null
      ? { partnerListingLabel: patch.partnerListingLabel }
      : {}),
    ...("priceEur" in patch ? { priceEur: patch.priceEur ?? null } : {}),
    ...("commissionPercent" in patch ? { commissionPercent: patch.commissionPercent ?? null } : {}),
    updatedAt: now,
  };

  if (patch.status && patch.status !== chat.status) {
    next.status = patch.status;
    if (patch.status === "ACTIVE") {
      next.activatedAt = now;
      next.rejectedAt = null;
      if (!next.bookingRef) {
        const bookingSeq = store.nextBookingSequentialNumber;
        next.bookingSequentialNumber = bookingSeq;
        next.bookingRef = formatBookingRef(bookingSeq);
        store.nextBookingSequentialNumber = bookingSeq + 1;
      }
      if (next.commissionPercent == null) next.commissionPercent = 0;
    }
    if (patch.status === "REJECTED") {
      next.rejectedAt = now;
    }
    if (patch.status === "COMPLETED") {
      next.completedAt = now;
    }
    if (patch.status === "OPEN") {
      next.activatedAt = null;
      next.rejectedAt = null;
      next.completedAt = null;
    }
  }

  store.chats[index] = next;
  await writeStore(store);
  return next;
}

export async function selectCustomBookingCar(input: {
  chatId: string;
  imageUrl: string;
  note?: string;
}): Promise<CustomBookingChat | null> {
  const store = await readStore();
  const index = store.chats.findIndex((c) => c.id === input.chatId);
  if (index < 0) return null;
  const chat = store.chats[index];
  const now = new Date().toISOString();
  const note = (input.note || "Selected car").trim();
  const message: CustomBookingMessage = {
    id: randomUUID(),
    sender: "GUEST",
    body: `I choose this car. ${note}`.trim(),
    createdAt: now,
    readByAdmin: false,
    readByGuest: true,
    imageUrl: input.imageUrl,
  };
  const next: CustomBookingChat = {
    ...chat,
    selectedCarImageUrl: input.imageUrl,
    selectedCarNote: note,
    messages: [...chat.messages, message],
    updatedAt: now,
    lastMessageAt: now,
  };
  store.chats[index] = next;
  await writeStore(store);
  return next;
}

export async function deleteCustomBookingChat(id: string): Promise<boolean> {
  const store = await readStore();
  const before = store.chats.length;
  store.chats = store.chats.filter((c) => c.id !== id);
  if (store.chats.length === before) return false;
  await writeStore(store);
  return true;
}

export function publicChatView(chat: CustomBookingChat) {
  return {
    id: chat.id,
    code: chat.code,
    status: chat.status,
    channel: chat.channel,
    firstName: chat.firstName,
    lastName: chat.lastName,
    email: chat.email,
    phone: chat.phone,
    phoneCountryIso2: chat.phoneCountryIso2,
    carPhotos: chat.carPhotos,
    selectedCarImageUrl: chat.selectedCarImageUrl,
    selectedCarNote: chat.selectedCarNote,
    bookingNote: chat.bookingNote,
    pickupAt: chat.pickupAt,
    dropoffAt: chat.dropoffAt,
    partnerListingId: chat.partnerListingId,
    partnerListingLabel: chat.partnerListingLabel,
    bookingRef: chat.bookingRef,
    bookingSequentialNumber: chat.bookingSequentialNumber,
    priceEur: chat.priceEur,
    commissionPercent: chat.commissionPercent,
    activatedAt: chat.activatedAt,
    rejectedAt: chat.rejectedAt,
    completedAt: chat.completedAt,
    createdAt: chat.createdAt,
    lastMessageAt: chat.lastMessageAt,
    unreadGuestCount: chat.messages.filter((m) => m.sender === "ADMIN" && !m.readByGuest).length,
    messages: chat.messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      createdAt: m.createdAt,
      readByGuest: m.readByGuest,
      readByAdmin: m.readByAdmin,
      imageUrl: m.imageUrl,
      carOffer: m.carOffer,
    })),
  };
}
