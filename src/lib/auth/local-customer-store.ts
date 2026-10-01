import { dataFile } from "@/lib/persistent-paths";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "@/lib/server/durable-fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { hashSecret, verifySecret } from "@/lib/crypto";
import { PORTAL_ID_START } from "@/lib/ids";
import type { PartnerSocialPlatform } from "@/lib/partner";

export type LocalCustomerRecord = {
  id: string;
  customerNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryOfResidence: string;
  preferredMessenger: PartnerSocialPlatform;
  messengers: PartnerSocialPlatform[];
  passwordHash: string;
  role: "CUSTOMER";
  status: "PENDING_OTP" | "ACTIVE" | "SUSPENDED";
  locale: string;
  otpCodeHash?: string | null;
  otpExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type StoreFile = {
  nextCustomerNumber: number;
  customers: LocalCustomerRecord[];
};

const STORE_PATH = dataFile("local-customers.json");

function emptyStore(): StoreFile {
  return { nextCustomerNumber: PORTAL_ID_START, customers: [] };
}

function readStore(): StoreFile {
  if (!existsSync(STORE_PATH)) return emptyStore();
  try {
    const parsed = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Partial<StoreFile>;
    return {
      nextCustomerNumber: Number(parsed.nextCustomerNumber) || PORTAL_ID_START,
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: StoreFile) {
  try {
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (error) {
    console.warn("[local-customers] file write failed", error);
  }
}

export function listLocalCustomers(): LocalCustomerRecord[] {
  return readStore().customers.slice().sort((a, b) => b.customerNumber - a.customerNumber);
}

export function findLocalCustomerByEmail(email: string): LocalCustomerRecord | null {
  const login = email.toLowerCase().trim();
  return readStore().customers.find((c) => c.email === login) ?? null;
}

export function findLocalCustomerById(id: string): LocalCustomerRecord | null {
  return readStore().customers.find((c) => c.id === id) ?? null;
}

export function createLocalCustomer(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryOfResidence: string;
  messengers: PartnerSocialPlatform[];
  password: string;
  locale?: string;
  otpCode: string;
}): LocalCustomerRecord {
  const store = readStore();
  const email = input.email.toLowerCase().trim();
  if (store.customers.some((c) => c.email === email)) {
    throw new Error("An account with this email already exists");
  }

  const customerNumber = store.nextCustomerNumber;
  const now = new Date().toISOString();
  const record: LocalCustomerRecord = {
    id: `local-customer-${randomUUID()}`,
    customerNumber,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email,
    phone: input.phone,
    countryOfResidence: input.countryOfResidence.toUpperCase(),
    preferredMessenger: input.messengers[0],
    messengers: [...new Set(input.messengers)],
    passwordHash: hashSecret(input.password),
    role: "CUSTOMER",
    status: "PENDING_OTP",
    locale: input.locale ?? "en",
    otpCodeHash: hashSecret(input.otpCode),
    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    createdAt: now,
    updatedAt: now,
  };

  store.customers.push(record);
  store.nextCustomerNumber = customerNumber + 1;
  writeStore(store);
  return record;
}

export function verifyLocalCustomerOtp(userId: string, code: string): LocalCustomerRecord | null {
  const store = readStore();
  const index = store.customers.findIndex((c) => c.id === userId);
  if (index < 0) return null;
  const customer = store.customers[index];
  if (!customer.otpCodeHash || !customer.otpExpiresAt) return null;
  if (new Date(customer.otpExpiresAt).getTime() < Date.now()) return null;
  if (!verifySecret(code, customer.otpCodeHash)) return null;

  const next: LocalCustomerRecord = {
    ...customer,
    status: "ACTIVE",
    otpCodeHash: null,
    otpExpiresAt: null,
    updatedAt: new Date().toISOString(),
  };
  store.customers[index] = next;
  writeStore(store);
  return next;
}

export function suspendLocalCustomer(id: string): LocalCustomerRecord | null {
  const store = readStore();
  const index = store.customers.findIndex((c) => c.id === id);
  if (index < 0) return null;
  const next: LocalCustomerRecord = {
    ...store.customers[index],
    status: "SUSPENDED",
    updatedAt: new Date().toISOString(),
  };
  store.customers[index] = next;
  writeStore(store);
  return next;
}

export function unsuspendLocalCustomer(id: string): LocalCustomerRecord | null {
  const store = readStore();
  const index = store.customers.findIndex((c) => c.id === id);
  if (index < 0) return null;
  const next: LocalCustomerRecord = {
    ...store.customers[index],
    status: "ACTIVE",
    updatedAt: new Date().toISOString(),
  };
  store.customers[index] = next;
  writeStore(store);
  return next;
}

export function deleteLocalCustomer(id: string): boolean {
  const store = readStore();
  const before = store.customers.length;
  store.customers = store.customers.filter((c) => c.id !== id);
  if (store.customers.length === before) return false;
  writeStore(store);
  return true;
}
