import "server-only";

import { join } from "node:path";
import { dataRoot } from "@/lib/persistent-paths";
import { mkdir, readFile, readFileForUpdate, withStoreLock, writeFile } from "@/lib/server/durable-fs";
import { createTtlCache } from "@/lib/server/ttl-cache";
import { tplChoiceCoversPartner } from "@/lib/extras/tpl-partner-choice";
import { partnerOperatingCountries } from "@/lib/server/extras/partner-country-scope";

const STORE = join(dataRoot(), "tpl-partner-choice.json");
const cache = createTtlCache<string[]>(30_000);

function normalizeIso2s(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .map((value) => String(value || "").trim().toUpperCase())
        .filter((iso) => /^[A-Z]{2}$/.test(iso)),
    ),
  ].sort();
}

function parseStore(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { iso2s?: unknown };
    return normalizeIso2s(parsed?.iso2s);
  } catch {
    return [];
  }
}

/** Countries where partners may turn TPL on or off. Empty = mandatory in every country. */
export async function readTplPartnerChoiceCountries(): Promise<string[]> {
  const hit = cache.get();
  if (hit) return hit;
  try {
    const raw = await readFile(STORE, "utf8");
    const value = parseStore(raw);
    cache.set(value);
    return value;
  } catch {
    return cache.peek() ?? [];
  }
}

/** Turn partner choice on or off for one country. Merges into the saved list. */
export async function setTplPartnerChoiceCountry(iso2: string, on: boolean): Promise<string[]> {
  const code = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) throw new Error("Invalid country");
  return withStoreLock(STORE, async () => {
    const current = parseStore(await readFileForUpdate(STORE));
    const next = on ? normalizeIso2s([...current, code]) : current.filter((iso) => iso !== code);
    await mkdir(dataRoot(), { recursive: true });
    await writeFile(STORE, JSON.stringify({ iso2s: next }, null, 2), "utf8");
    cache.set(next);
    return next;
  });
}

/** True when this partner operates only in countries where TPL is optional. */
export async function partnerMayToggleTpl(partnerId: string, countries?: string[]): Promise<boolean> {
  const optional = await readTplPartnerChoiceCountries();
  if (!optional.length) return false;
  const operating = countries?.length ? countries : await partnerOperatingCountries(partnerId);
  return tplChoiceCoversPartner(operating, optional);
}
