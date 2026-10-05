import "server-only";

import type { Currency } from "@/lib/i18n/config";
import { convertFromEur, formatMoney, roundMoney } from "@/lib/utils";
import { readFile, writeFile } from "@/lib/server/durable-fs";
import { ensureDataDir, resolveDataFile } from "@/lib/server/data-paths";
import { ensureDailyFxRates } from "@/lib/server/fx-rates-sync";
import { readPreferences } from "@/lib/server/preferences";

export type PlatformCharge = {
  currency: Currency;
  /** Exact amount in `currency` to transfer into the platform account. */
  amount: number;
  /** EUR amount this charge settles (the online / pay-now portion). */
  amountEur: number;
  amountLabel: string;
  ratesUpdatedAt: string;
};

type StoredCharge = PlatformCharge & { bookingId: string; recordedAt: string };

async function chargesPath() {
  return resolveDataFile("bookings", "platform-charges.json");
}

async function readCharges(): Promise<StoredCharge[]> {
  try {
    const raw = await readFile(await chargesPath(), "utf8");
    const parsed = JSON.parse(raw) as { charges?: StoredCharge[] };
    return Array.isArray(parsed.charges) ? parsed.charges : [];
  } catch {
    return [];
  }
}

/** Convert the pay-now EUR amount with today's rates into the visitor's currency. */
export async function quotePlatformCharge(amountEur: number): Promise<PlatformCharge> {
  const rates = await ensureDailyFxRates();
  const { currency } = await readPreferences();
  const eur = roundMoney(Math.max(0, amountEur));
  const amount = roundMoney(convertFromEur(eur, currency, rates));
  const { getPlatformSettings } = await import("@/lib/server/platform-settings-store");
  const settings = await getPlatformSettings();
  return {
    currency,
    amount,
    amountEur: eur,
    amountLabel: formatMoney(eur, currency, rates),
    ratesUpdatedAt: settings.fxRatesUpdatedAt || new Date().toISOString(),
  };
}

/** Remember the exact currency amount credited for a booking. */
export async function recordPlatformCharge(bookingId: string, charge: PlatformCharge) {
  const id = bookingId.trim();
  if (!id) return;
  const charges = await readCharges();
  const next: StoredCharge = { ...charge, bookingId: id, recordedAt: new Date().toISOString() };
  const without = charges.filter((row) => row.bookingId !== id);
  without.unshift(next);
  await ensureDataDir("bookings");
  await writeFile(
    await chargesPath(),
    JSON.stringify({ charges: without.slice(0, 5000) }, null, 2),
    "utf8",
  );
}
