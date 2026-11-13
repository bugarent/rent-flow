import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import {
  mkdir,
  readFile,
  readFileForUpdate,
  StoreUnavailableError,
  withStoreLock,
  writeFile,
} from "@/lib/server/durable-fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  slugifyExtraName,
  toExtraServicePricing,
  type ExtraServicePricing,
} from "@/lib/extras/pricing";
import {
  missingExtraCopyLocales,
  readExtraI18n,
  type ExtraCopyBag,
} from "@/lib/extras/localized-copy";

const STORE = join(dataRoot(), "partner-custom-extras.json");

export type PartnerCustomExtra = {
  id: string;
  slug: string;
  name: string;
  description: string;
  nameI18n?: ExtraCopyBag;
  descriptionI18n?: ExtraCopyBag;
  defaultPriceEur: number;
  maxPriceEur: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

async function readStoreForUpdate(): Promise<StoreFile> {
  const raw = await readFileForUpdate(STORE);
  if (raw == null) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object") throw new StoreUnavailableError();
  return parsed as StoreFile;
}

async function translateCustomCopy(
  name: string,
  description: string,
  existing?: { name?: ExtraCopyBag; description?: ExtraCopyBag },
): Promise<{ nameI18n: ExtraCopyBag; descriptionI18n: ExtraCopyBag }> {
  try {
    const { fillExtraCopy } = await import("@/lib/server/extras/translate-copy");
    return await fillExtraCopy(name, description, existing);
  } catch (error) {
    console.warn("[partner-custom-extras] translate", error);
    return { nameI18n: existing?.name || {}, descriptionI18n: existing?.description || {} };
  }
}

function needsCopy(row: PartnerCustomExtra) {
  return (
    missingExtraCopyLocales(row.name, readExtraI18n({ i18n: row.nameI18n })).length > 0 ||
    missingExtraCopyLocales(row.description || "", readExtraI18n({ i18n: row.descriptionI18n })).length > 0
  );
}

/** Fill missing translations of partner-created services. Only the two i18n fields of a row change. */
export async function ensurePartnerCustomExtraCopy(): Promise<void> {
  const store = await readStore();
  const pending: Array<{ id: string; nameI18n: ExtraCopyBag; descriptionI18n: ExtraCopyBag }> = [];
  for (const rows of Object.values(store)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (row.isActive === false || !needsCopy(row)) continue;
      const filled = await translateCustomCopy(row.name, row.description || "", {
        name: readExtraI18n({ i18n: row.nameI18n }),
        description: readExtraI18n({ i18n: row.descriptionI18n }),
      });
      pending.push({ id: row.id, ...filled });
    }
  }
  if (!pending.length) return;
  const byId = new Map(pending.map((item) => [item.id, item]));
  await withStoreLock(STORE, async () => {
    const latest = await readStoreForUpdate();
    const next: StoreFile = {};
    for (const [partnerId, rows] of Object.entries(latest)) {
      next[partnerId] = Array.isArray(rows)
        ? rows.map((row) => {
            const filled = byId.get(row.id);
            if (!filled) return row;
            return {
              ...row,
              nameI18n: { ...filled.nameI18n, ...readExtraI18n({ i18n: row.nameI18n }) },
              descriptionI18n: { ...filled.descriptionI18n, ...readExtraI18n({ i18n: row.descriptionI18n }) },
            };
          })
        : rows;
    }
    await writeStore(next);
  });
}

type StoreFile = Record<string, PartnerCustomExtra[]>;

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

export function partnerCustomToPricing(row: PartnerCustomExtra): ExtraServicePricing {
  return toExtraServicePricing({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    nameI18n: readExtraI18n({ i18n: row.nameI18n }),
    descriptionI18n: readExtraI18n({ i18n: row.descriptionI18n }),
    isTpl: false,
    isActive: row.isActive !== false,
    sortOrder: 900,
    defaultPriceEur: row.defaultPriceEur,
    minPriceEur: 0,
    maxPriceEur: row.maxPriceEur,
    checkoutSlot: "none",
  });
}

export async function listPartnerCustomExtras(
  partnerId: string,
  opts?: { activeOnly?: boolean },
): Promise<PartnerCustomExtra[]> {
  const id = String(partnerId || "").trim();
  if (!id) return [];
  const store = await readStore();
  const rows = Array.isArray(store[id]) ? store[id] : [];
  if (opts?.activeOnly) return rows.filter((r) => r.isActive !== false);
  return rows;
}

export async function listPartnerCustomExtrasAsPricing(
  partnerId: string,
  opts?: { activeOnly?: boolean },
): Promise<ExtraServicePricing[]> {
  const rows = await listPartnerCustomExtras(partnerId, opts);
  return rows.map(partnerCustomToPricing);
}

export async function listAllPartnerCustomExtras(): Promise<PartnerCustomExtra[]> {
  const store = await readStore();
  const rows: PartnerCustomExtra[] = [];
  for (const list of Object.values(store)) {
    if (!Array.isArray(list)) continue;
    rows.push(...list);
  }
  return rows;
}

export async function findPartnerCustomExtra(
  extraServiceId: string,
): Promise<{ partnerId: string; extra: PartnerCustomExtra } | null> {
  const id = String(extraServiceId || "").trim();
  if (!id) return null;
  const store = await readStore();
  for (const [partnerId, rows] of Object.entries(store)) {
    if (!Array.isArray(rows)) continue;
    const extra = rows.find((r) => r.id === id);
    if (extra) return { partnerId, extra };
  }
  return null;
}

export async function createPartnerCustomExtra(
  partnerId: string,
  input: {
    name: string;
    description?: string;
    priceEur?: number;
    maxPriceEur?: number | null;
  },
): Promise<PartnerCustomExtra> {
  const pid = String(partnerId || "").trim();
  if (!pid) throw new Error("Partner required");
  const name = String(input.name || "").trim();
  if (name.length < 2) throw new Error("Name is too short");

  const price = Number(input.priceEur);
  const defaultPriceEur = Number.isFinite(price) && price >= 0 ? Number(price.toFixed(2)) : 0;
  const maxRaw = input.maxPriceEur;
  let maxPriceEur: number | null =
    maxRaw == null ? (defaultPriceEur > 0 ? defaultPriceEur : null) : Number(maxRaw);
  if (maxPriceEur != null && (!Number.isFinite(maxPriceEur) || maxPriceEur < 0)) maxPriceEur = null;
  if (maxPriceEur != null && maxPriceEur < defaultPriceEur) maxPriceEur = defaultPriceEur;

  const description = String(input.description || "").trim();
  const copy = await translateCustomCopy(name, description);

  return withStoreLock(STORE, async () => {
    const store = await readStoreForUpdate();
    const existing = Array.isArray(store[pid]) ? store[pid] : [];
    const baseSlug = slugifyExtraName(name) || "custom-extra";
    let slug = `p-${baseSlug}`;
    let n = 1;
    const used = new Set(existing.map((r) => r.slug));
    while (used.has(slug)) {
      slug = `p-${baseSlug}-${++n}`;
      if (n > 50) throw new Error("Could not allocate a unique slug");
    }

    const now = new Date().toISOString();
    const row: PartnerCustomExtra = {
      id: randomUUID(),
      slug,
      name,
      description,
      ...(Object.keys(copy.nameI18n).length ? { nameI18n: copy.nameI18n } : {}),
      ...(Object.keys(copy.descriptionI18n).length ? { descriptionI18n: copy.descriptionI18n } : {}),
      defaultPriceEur,
      maxPriceEur,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    await writeStore({ ...store, [pid]: [...existing, row] });
    return row;
  });
}

/**
 * Partner removes their own service. The row is kept inactive (past bookings still name it);
 * it no longer appears in the cabinet, on listings or at checkout.
 */
export async function deactivatePartnerCustomExtra(partnerId: string, extraId: string): Promise<boolean> {
  const pid = String(partnerId || "").trim();
  const id = String(extraId || "").trim();
  if (!pid || !id) return false;
  return withStoreLock(STORE, async () => {
    const raw = await readFileForUpdate(STORE);
    let store: StoreFile = {};
    if (raw != null) {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") throw new StoreUnavailableError();
      store = parsed as StoreFile;
    }
    const rows = Array.isArray(store[pid]) ? store[pid] : [];
    const index = rows.findIndex((r) => r.id === id);
    if (index < 0) return false;
    const next = [...rows];
    next[index] = { ...rows[index], isActive: false, updatedAt: new Date().toISOString() };
    await writeStore({ ...store, [pid]: next });
    return true;
  });
}
