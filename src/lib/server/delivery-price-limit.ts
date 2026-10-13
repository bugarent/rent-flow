import "server-only";

import { dataRoot, isServerlessHost } from "@/lib/persistent-paths";
import { join } from "node:path";
import { mkdir, readFileForUpdate, writeFile } from "@/lib/server/durable-fs";
import { DEFAULT_DELIVERY_MAX_EUR } from "@/lib/delivery/pricing";

/** Amounts the old code wrote automatically when a location was created. */
const LEGACY_AUTO_LIMITS_EUR = new Set([10, 100]);
const MARKER = join(dataRoot(), "delivery-free-default-migration.json");

let legacyReset: Promise<void> | null = null;

async function runLegacyReset(): Promise<void> {
  // Throws when the marker cannot be read, so the reset never runs twice by mistake.
  const marker = await readFileForUpdate(MARKER);
  if (marker != null) return;

  const { listDeliveryLocations, updateDeliveryLocation } = await import("@/lib/server/delivery-locations");
  const all = await listDeliveryLocations({ activeOnly: false });
  const targets = all.filter((loc) => LEGACY_AUTO_LIMITS_EUR.has(Number(loc.maxDeliveryPriceEur)));

  // Backup first: every previous limit stays recorded and can be restored.
  const backup = targets.map((loc) => ({
    id: loc.id,
    code: loc.iata || loc.airportId,
    previousMaxDeliveryPriceEur: Number(loc.maxDeliveryPriceEur),
  }));
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(
    MARKER,
    JSON.stringify({ done: true, at: new Date().toISOString(), backup }, null, 2),
    "utf8",
  );

  for (const loc of targets) {
    try {
      await updateDeliveryLocation(loc.id, { maxDeliveryPriceEur: DEFAULT_DELIVERY_MAX_EUR });
    } catch (error) {
      console.warn("[delivery-price-limit] legacy reset skipped", loc.iata, error);
    }
  }
}

/**
 * One-time: locations that only carry an automatically assigned limit become free.
 * Runs on the deployed site only — a local copy of the stores may be stale.
 * Partner prices are not touched; the limit is applied when fees are calculated.
 */
export function resetLegacyAutoDeliveryLimits(): Promise<void> {
  if (!isServerlessHost()) return Promise.resolve();
  legacyReset ??= runLegacyReset().catch((error) => {
    console.warn("[delivery-price-limit] legacy reset postponed:", error);
    legacyReset = null;
  });
  return legacyReset;
}
