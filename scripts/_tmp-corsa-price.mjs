import pg from "pg";

function databaseUrl() {
  let value = (process.env.DATABASE_URL ?? "").trim();
  value = value.replace(/^DATABASE_URL\s*=\s*/i, "").trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function parseDetails(description) {
  if (!description) return null;
  const m = /<!--car-details:([\s\S]*?)-->/.exec(description);
  if (!m?.[1]) return { error: "no blob", len: description.length };
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    return { error: String(e), snippet: m[1].slice(0, 200), blobLen: m[1].length };
  }
}

function rate(details, daily, discount, days) {
  let base = daily;
  const tiers = details?.pricingTiers;
  let matched = null;
  if (Array.isArray(tiers) && tiers.length) {
    matched = tiers.find((t) => {
      const from = Number(t.fromDays) || 1;
      const to = Number(t.toDays) || 9999;
      return days >= from && days <= to;
    });
    const tierPrice = matched != null ? Number(matched.priceEur) : NaN;
    if (Number.isFinite(tierPrice) && tierPrice > 0) base = tierPrice;
  }
  const d = Number.isFinite(discount) ? Math.min(100, Math.max(-100, discount)) / 100 : 0;
  return { days, base, daily: Math.max(0, base * (1 - d)), matched };
}

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
const car = await client.query(
  `SELECT c.id, c.status, c."dailyRateEur"::float AS daily, c."discountPercent"::float AS discount,
          c.description, p."companySettings"
   FROM "Car" c JOIN "Partner" p ON p.id = c."partnerId"
   WHERE c.id = $1`,
  ["cmw4y202g002d09jt9wfgej5u"],
);
const row = car.rows[0];
const details = parseDetails(row.description);
const settings = row.companySettings;
const tariffs = settings?.tariffs ?? settings?.tariffIntervals ?? null;
const seasonal = settings?.seasonalPricing ?? null;
console.log(JSON.stringify({
  status: row.status,
  daily: row.daily,
  discount: row.discount,
  descLen: row.description?.length ?? 0,
  blobCount: (row.description?.match(/<!--car-details:/g) || []).length,
  tariffs,
  seasonalEnabled: seasonal?.enabled ?? null,
  seasonCount: Array.isArray(seasonal?.seasons) ? seasonal.seasons.length : 0,
  tiers: details?.pricingTiers ?? details,
  pricingCurrency: details?.pricingCurrency ?? null,
  day7: details?.pricingTiers ? rate(details, row.daily, row.discount, 7) : null,
  day5: details?.pricingTiers ? rate(details, row.daily, row.discount, 5) : null,
  day15: details?.pricingTiers ? rate(details, row.daily, row.discount, 15) : null,
}, null, 2));
await client.end();
