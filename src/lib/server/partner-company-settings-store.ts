import { dataRoot } from "@/lib/persistent-paths";
import { readFile, writeFile, mkdir } from "@/lib/server/durable-fs";
import { join } from "node:path";
import {
  defaultCompanySettings,
  parseCompanySettings,
  type PartnerCompanySettings,
} from "@/lib/partners/company-settings";
import { parseIso2List, parsePartnerMessengers } from "@/lib/partner";
import { parsePartnerApplicationMessages } from "@/lib/partner-application-messages";

const STORE = join(dataRoot(), "partner-company-settings.json");

type StoreFile = Record<string, PartnerCompanySettings>;

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(STORE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as StoreFile;
  } catch {
    return {};
  }
}

async function writeStore(data: StoreFile) {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(STORE, JSON.stringify(data, null, 2), "utf8");
}

export async function readCompanySettingsFile(partnerId: string): Promise<PartnerCompanySettings | null> {
  const store = await readStore();
  return store[partnerId] ? parseCompanySettings(store[partnerId]) : null;
}

export async function listCompanySettingsFiles(): Promise<
  Array<{ partnerId: string; settings: PartnerCompanySettings }>
> {
  const store = await readStore();
  return Object.entries(store).map(([partnerId, raw]) => ({
    partnerId,
    settings: parseCompanySettings(raw),
  }));
}

export async function writeCompanySettingsFile(partnerId: string, settings: PartnerCompanySettings) {
  const next = parseCompanySettings(settings);
  const store = await readStore();
  store[partnerId] = next;
  await writeStore(store);
  return next;
}

/** Countries and places from the latest partnership application, when settings have none. */
function withApplicationPlaces(
  settings: PartnerCompanySettings,
  applicationMessages: unknown,
): PartnerCompanySettings {
  if (settings.deliveryLocationIds?.length || applicationMessages == null) return settings;
  const messages = parsePartnerApplicationMessages(applicationMessages);
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const snapshot = messages[index]?.snapshot;
    if (!snapshot?.locationCodes.length) continue;
    const countries = parseIso2List(snapshot.countryIso2s);
    return {
      ...settings,
      deliveryCountryIso2s: countries.length ? countries : settings.deliveryCountryIso2s,
      deliveryLocationIds: snapshot.locationCodes,
    };
  }
  return settings;
}

export async function resolveCompanySettings(
  partner: {
    id: string;
    companySettings?: unknown;
    companyName?: string;
    email?: string | null;
    phone?: string | null;
    secondaryPhone?: string | null;
    messengers?: unknown;
    messenger?: string | null;
    operatingCountryIso2s?: unknown;
    applicationMessages?: unknown;
  },
): Promise<PartnerCompanySettings> {
  return withApplicationPlaces(await resolveStoredCompanySettings(partner), partner.applicationMessages);
}

async function resolveStoredCompanySettings(
  partner: Parameters<typeof resolveCompanySettings>[0],
): Promise<PartnerCompanySettings> {
  const fromPartnerCountries = parseIso2List(partner.operatingCountryIso2s);
  const partnerMessengers = parsePartnerMessengers(partner.messengers, partner.messenger);
  const seed = {
    companyName: partner.companyName,
    email: partner.email || undefined,
    phone: partner.phone || undefined,
    secondaryPhone: partner.secondaryPhone,
    messengers: partnerMessengers,
    primaryMessengers: partnerMessengers,
    messenger: partner.messenger,
    deliveryCountryIso2s: fromPartnerCountries.length ? fromPartnerCountries : ["GE"],
  };
  const fromDb =
    partner.companySettings != null ? parseCompanySettings(partner.companySettings, seed) : null;
  if (fromDb && (fromDb.title || fromDb.legalName || fromDb.email)) {
    let next = fromDb;
    if (!next.deliveryCountryIso2s.length && fromPartnerCountries.length) {
      next = { ...next, deliveryCountryIso2s: fromPartnerCountries };
    }
    if (!next.primaryMessengers.length && partnerMessengers.length) {
      next = { ...next, primaryMessengers: partnerMessengers };
    }
    return next;
  }
  const fromFile = await readCompanySettingsFile(partner.id);
  if (fromFile) {
    let parsed = parseCompanySettings(fromFile, seed);
    if (!parsed.deliveryCountryIso2s.length && fromPartnerCountries.length) {
      parsed = { ...parsed, deliveryCountryIso2s: fromPartnerCountries };
    }
    if (!parsed.primaryMessengers.length && partnerMessengers.length) {
      parsed = { ...parsed, primaryMessengers: partnerMessengers };
    }
    return parsed;
  }
  return defaultCompanySettings(seed);
}
