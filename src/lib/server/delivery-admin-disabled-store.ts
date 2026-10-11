import { join } from "node:path";
import { dataRoot } from "@/lib/persistent-paths";
import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { normalizeLocationCode } from "@/lib/catalog/search-places";

/**
 * Pickup places an administrator switched off by hand. Partner syncs never turn
 * these back on; only an explicit admin action (switch on, partner approval) does.
 */
const STORE = join(dataRoot(), "delivery-admin-disabled.json");

function key(code: string) {
  return normalizeLocationCode(code || "").toUpperCase();
}

export async function readAdminDisabledPlaces(): Promise<Set<string>> {
  try {
    const parsed = JSON.parse(await readFile(STORE, "utf8")) as unknown;
    return new Set(Array.isArray(parsed) ? parsed.map((c) => key(String(c))).filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

async function writeAdminDisabledPlaces(codes: Set<string>) {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(STORE, JSON.stringify([...codes].sort(), null, 2), "utf8");
}

export async function markAdminDisabledPlace(code: string, disabled: boolean) {
  const k = key(code);
  if (!k) return;
  const codes = await readAdminDisabledPlaces();
  if (disabled === codes.has(k)) return;
  if (disabled) codes.add(k);
  else codes.delete(k);
  await writeAdminDisabledPlaces(codes);
}

export async function clearAdminDisabledPlaces(rawCodes: string[]) {
  const codes = await readAdminDisabledPlaces();
  let changed = false;
  for (const raw of rawCodes) {
    if (codes.delete(key(raw))) changed = true;
  }
  if (changed) await writeAdminDisabledPlaces(codes);
}
