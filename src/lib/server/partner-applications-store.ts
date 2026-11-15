import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PORTAL_ID_START } from "@/lib/ids";
import {
  buildPartnerApplicationMessage,
  parsePartnerApplicationMessages,
  partnerReapplyWindowStart,
  type PartnerApplicationMessage,
  type PartnerApplicationMessageSnapshot,
} from "@/lib/partner-application-messages";

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "partner-applications.json");

export type FilePartnerApplication = {
  id: string;
  kind: "COMPANY" | "PRIVATE";
  companyName: string;
  contactName: string;
  personalId: string;
  representativeFirstName: string;
  representativeLastName: string;
  email: string;
  phone: string;
  phoneCountryIso2: string;
  secondaryPhone: string | null;
  secondaryPhoneCountryIso2: string | null;
  messengers: string[];
  fleetSize: number;
  fleetAgeRange: string;
  operatingCountryIso2s: string[];
  status: "PENDING" | "INVITED" | "REJECTED" | "APPROVED" | "PENDING_FINAL" | "NEEDS_CORRECTION";
  rejectionNote: string | null;
  applicationMessages: PartnerApplicationMessage[];
  unreadReapplyCount: number;
  /** Unread for admin nav (new app or re-apply). */
  unreadForAdmin: number;
  sequentialNumber: number | null;
  createdAt: string;
  updatedAt: string;
};

type StoreFile = {
  nextSequentialNumber: number;
  partners: FilePartnerApplication[];
};

function emptyStore(): StoreFile {
  return { nextSequentialNumber: PORTAL_ID_START, partners: [] };
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return {
      nextSequentialNumber: Number(parsed.nextSequentialNumber) || PORTAL_ID_START,
      partners: Array.isArray(parsed.partners) ? (parsed.partners as FilePartnerApplication[]) : [],
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: StoreFile) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function listFilePartnerApplications(): Promise<FilePartnerApplication[]> {
  const store = await readStore();
  return [...store.partners].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getFilePartnerUnreadTotal(): Promise<number> {
  const partners = await listFilePartnerApplications();
  return partners.reduce((sum, p) => sum + (Number(p.unreadForAdmin) || 0), 0);
}

export async function getFilePartnerById(id: string): Promise<FilePartnerApplication | null> {
  const store = await readStore();
  return store.partners.find((p) => p.id === id) ?? null;
}

/** Reuse an existing application’s PRT number when email matches. */
export async function findFilePartnerSequentialByEmail(email: string): Promise<number | null> {
  const login = String(email || "")
    .trim()
    .toLowerCase();
  if (!login) return null;
  const store = await readStore();
  const match = store.partners
    .filter((p) => p.email.trim().toLowerCase() === login && p.sequentialNumber != null)
    .sort((a, b) => (b.sequentialNumber || 0) - (a.sequentialNumber || 0))[0];
  return match?.sequentialNumber ?? null;
}

/** Release PRT numbers held by rejected/cancelled file applications. */
export async function clearRejectedFilePartnerSequentialNumbers(): Promise<void> {
  const store = await readStore();
  let changed = false;
  for (let i = 0; i < store.partners.length; i++) {
    if (store.partners[i].status === "REJECTED" && store.partners[i].sequentialNumber != null) {
      store.partners[i] = { ...store.partners[i], sequentialNumber: null };
      changed = true;
    }
  }
  if (changed) await writeStore(store);
}

/**
 * Allocate the lowest free PRT number (fills gaps after delete/reject).
 * Prefers the shared DB allocator; falls back to file-store gap scan offline.
 */
export async function allocateFilePartnerSequentialNumber(): Promise<number> {
  try {
    const { nextPartnerSequentialNumber } = await import("@/lib/sequential-ids");
    const seq = await nextPartnerSequentialNumber();
    const store = await readStore();
    store.nextSequentialNumber = Math.max(store.nextSequentialNumber, seq + 1);
    await writeStore(store);
    return seq;
  } catch {
    await clearRejectedFilePartnerSequentialNumbers();
    const store = await readStore();
    const used = new Set<number>();
    for (const p of store.partners) {
      if (
        p.status !== "REJECTED" &&
        p.sequentialNumber != null &&
        p.sequentialNumber >= PORTAL_ID_START
      ) {
        used.add(p.sequentialNumber);
      }
    }
    let seq = PORTAL_ID_START;
    while (used.has(seq)) seq += 1;
    store.nextSequentialNumber = Math.max(store.nextSequentialNumber, seq + 1);
    await writeStore(store);
    return seq;
  }
}

export async function findFilePartnerByEmail(email: string): Promise<FilePartnerApplication | null> {
  const login = String(email || "")
    .trim()
    .toLowerCase();
  if (!login) return null;
  const store = await readStore();
  return (
    store.partners
      .filter((p) => p.email.trim().toLowerCase() === login)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null
  );
}

export async function markFilePartnerRead(id: string): Promise<FilePartnerApplication | null> {
  const store = await readStore();
  const index = store.partners.findIndex((p) => p.id === id);
  if (index < 0) return null;
  const messages = parsePartnerApplicationMessages(store.partners[index].applicationMessages).map((m) =>
    m.kind === "REAPPLY" ? { ...m, readByAdmin: true } : m,
  );
  store.partners[index] = {
    ...store.partners[index],
    applicationMessages: messages,
    unreadReapplyCount: 0,
    unreadForAdmin: 0,
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return store.partners[index];
}

export async function updateFilePartnerStatus(
  id: string,
  status: FilePartnerApplication["status"],
  rejectionNote?: string | null,
): Promise<FilePartnerApplication | null> {
  const store = await readStore();
  const index = store.partners.findIndex((p) => p.id === id);
  if (index < 0) return null;
  store.partners[index] = {
    ...store.partners[index],
    status,
    rejectionNote: rejectionNote ?? store.partners[index].rejectionNote,
    // Free the PRT slot when cancelled/rejected so new partners can fill gaps.
    sequentialNumber:
      status === "REJECTED" ? null : store.partners[index].sequentialNumber,
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return store.partners[index];
}

export async function createOrReapplyFilePartner(input: {
  snapshot: PartnerApplicationMessageSnapshot;
  contactName: string;
  secondaryPhone: string | null;
  secondaryPhoneCountryIso2: string | null;
}): Promise<{ partner: FilePartnerApplication; reapplied: boolean }> {
  const store = await readStore();
  const { snapshot } = input;
  const windowStart = partnerReapplyWindowStart();

  const existing = store.partners
    .filter(
      (p) =>
        (p.status === "PENDING" || p.status === "REJECTED") &&
        new Date(p.updatedAt) >= windowStart &&
        (p.email === snapshot.email || p.phone === snapshot.phone),
    )
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  if (existing) {
    const index = store.partners.findIndex((p) => p.id === existing.id);
    const messages = parsePartnerApplicationMessages(existing.applicationMessages);
    if (!messages.some((m) => m.kind === "INITIAL")) {
      messages.unshift(
        buildPartnerApplicationMessage(
          "INITIAL",
          {
            firstName: existing.representativeFirstName,
            lastName: existing.representativeLastName,
            kind: existing.kind,
            identificationNumber: existing.personalId,
            email: existing.email,
            phone: existing.phone,
            phoneCountryIso2: existing.phoneCountryIso2,
            messengers: existing.messengers,
            fleetSize: existing.fleetSize,
            fleetAgeRange: existing.fleetAgeRange,
            countryIso2s: existing.operatingCountryIso2s,
            locationCodes: [],
          },
          true,
        ),
      );
    }
    messages.push(buildPartnerApplicationMessage("REAPPLY", snapshot, false));
    const unreadReapplyCount = messages.filter((m) => m.kind === "REAPPLY" && !m.readByAdmin).length;
    let sequentialNumber = existing.sequentialNumber;
    if (sequentialNumber == null || sequentialNumber < PORTAL_ID_START) {
      sequentialNumber = await allocateFilePartnerSequentialNumber();
    }
    const fresh = await readStore();
    const freshIndex = fresh.partners.findIndex((p) => p.id === existing.id);
    const updated: FilePartnerApplication = {
      ...existing,
      kind: snapshot.kind,
      contactName: input.contactName,
      companyName:
        snapshot.kind === "COMPANY" ? input.contactName : `${input.contactName} (Private)`,
      personalId: snapshot.identificationNumber,
      representativeFirstName: snapshot.firstName,
      representativeLastName: snapshot.lastName,
      email: snapshot.email,
      phone: snapshot.phone,
      phoneCountryIso2: snapshot.phoneCountryIso2,
      secondaryPhone: input.secondaryPhone,
      secondaryPhoneCountryIso2: input.secondaryPhoneCountryIso2,
      messengers: snapshot.messengers,
      fleetSize: snapshot.fleetSize,
      fleetAgeRange: snapshot.fleetAgeRange,
      operatingCountryIso2s: snapshot.countryIso2s,
      status: existing.status === "REJECTED" ? "PENDING" : existing.status,
      applicationMessages: messages,
      unreadReapplyCount,
      unreadForAdmin: unreadReapplyCount || 1,
      sequentialNumber,
      updatedAt: new Date().toISOString(),
    };
    if (freshIndex >= 0) fresh.partners[freshIndex] = updated;
    else fresh.partners.unshift(updated);
    await writeStore(fresh);
    return { partner: updated, reapplied: true };
  }

  const activeByEmail = store.partners.find(
    (p) =>
      p.email === snapshot.email &&
      ["PENDING", "INVITED", "PENDING_FINAL", "NEEDS_CORRECTION", "APPROVED"].includes(p.status),
  );
  if (activeByEmail) {
    throw new Error("EMAIL_EXISTS");
  }

  const digits = (v: string) => String(v || "").replace(/\D/g, "");
  const phoneKey = digits(snapshot.phone);
  const phoneTail = phoneKey.length > 9 ? phoneKey.slice(-9) : phoneKey;
  const activeByPhone = store.partners.find((p) => {
    if (!["PENDING", "INVITED", "PENDING_FINAL", "NEEDS_CORRECTION", "APPROVED"].includes(p.status)) {
      return false;
    }
    const keys = [digits(p.phone), digits(p.secondaryPhone || "")].filter(Boolean);
    return keys.some((k) => {
      if (k === phoneKey) return true;
      const tail = k.length > 9 ? k.slice(-9) : k;
      return phoneTail.length >= 8 && tail === phoneTail;
    });
  });
  if (activeByPhone) {
    throw new Error("PHONE_EXISTS");
  }

  const now = new Date().toISOString();
  const seq = await allocateFilePartnerSequentialNumber();
  const initial = buildPartnerApplicationMessage("INITIAL", snapshot, true);
  const partner: FilePartnerApplication = {
    id: randomUUID(),
    kind: snapshot.kind,
    companyName: snapshot.kind === "COMPANY" ? input.contactName : `${input.contactName} (Private)`,
    contactName: input.contactName,
    personalId: snapshot.identificationNumber,
    representativeFirstName: snapshot.firstName,
    representativeLastName: snapshot.lastName,
    email: snapshot.email,
    phone: snapshot.phone,
    phoneCountryIso2: snapshot.phoneCountryIso2,
    secondaryPhone: input.secondaryPhone,
    secondaryPhoneCountryIso2: input.secondaryPhoneCountryIso2,
    messengers: snapshot.messengers,
    fleetSize: snapshot.fleetSize,
    fleetAgeRange: snapshot.fleetAgeRange,
    operatingCountryIso2s: snapshot.countryIso2s,
    status: "PENDING",
    rejectionNote: null,
    applicationMessages: [initial],
    unreadReapplyCount: 0,
    unreadForAdmin: 1,
    sequentialNumber: seq,
    createdAt: now,
    updatedAt: now,
  };
  const fresh = await readStore();
  fresh.partners.unshift(partner);
  fresh.nextSequentialNumber = Math.max(fresh.nextSequentialNumber, seq + 1);
  await writeStore(fresh);
  return { partner, reapplied: false };
}
