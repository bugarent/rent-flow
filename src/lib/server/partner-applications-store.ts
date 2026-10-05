import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
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
  return { nextSequentialNumber: 1000, partners: [] };
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return {
      nextSequentialNumber: Number(parsed.nextSequentialNumber) || 1000,
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

/** Allocate the next PRT sequential number from the local applications counter. */
export async function allocateFilePartnerSequentialNumber(): Promise<number> {
  const store = await readStore();
  const seq = Math.max(1000, Number(store.nextSequentialNumber) || 1000);
  store.nextSequentialNumber = seq + 1;
  await writeStore(store);
  return seq;
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
      applicationMessages: messages,
      unreadReapplyCount,
      unreadForAdmin: unreadReapplyCount || 1,
      updatedAt: new Date().toISOString(),
    };
    store.partners[index] = updated;
    await writeStore(store);
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
  const seq = store.nextSequentialNumber;
  store.nextSequentialNumber = seq + 1;
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
  store.partners.unshift(partner);
  await writeStore(store);
  return { partner, reapplied: false };
}
