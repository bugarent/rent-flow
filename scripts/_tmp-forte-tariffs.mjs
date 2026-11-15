import pg from "pg";

function databaseUrl() {
  let value = (process.env.DATABASE_URL ?? "").trim();
  value = value.replace(/^DATABASE_URL\s*=\s*/i, "").trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();

const cars = await client.query(`
  SELECT c.id, c."partnerId", c.make, c.model, c.year, c."registrationNumber",
         substring(c.description from 'pricingTiers":\\[.*?\\]') AS tiers
  FROM "Car" c
  WHERE c."registrationNumber" ILIKE '%ED298%'
     OR c.description ILIKE '%37ED298%'
     OR (c.make ILIKE 'Kia' AND c.model ILIKE 'Forte' AND c.year = 2018)
  LIMIT 8
`);
for (const row of cars.rows) {
  console.log("--- car", row.make, row.model, row.year, row.registrationNumber, row.partnerId);
  console.log(String(row.tiers || "").slice(0, 800));
  const settings = await client.query(
    `SELECT payload->$1->'tariffs' AS tariffs,
            payload->$1->>'title' AS title,
            payload->$1->>'email' AS email
     FROM "JsonStore" WHERE key = 'partner-company-settings.json'`,
    [row.partnerId],
  );
const meta = await client.query(
  `SELECT "companySettings"->>'title' AS title,
          "companySettings"->>'email' AS email,
          "companySettings"->>'legalName' AS legal
   FROM "Partner" WHERE id = $1`,
  [row.partnerId],
);
console.log("db meta", meta.rows[0]);
  const partner = await client.query(
    `SELECT "companySettings"->'tariffs' AS tariffs FROM "Partner" WHERE id = $1`,
    [row.partnerId],
  );
  console.log("db tariffs", JSON.stringify(partner.rows[0]?.tariffs ?? null));
  console.log("file tariffs", JSON.stringify(settings.rows[0]?.tariffs ?? null));
}

const keys = await client.query(`
  SELECT key FROM "JsonStore" WHERE key ILIKE '%company-settings%' LIMIT 15
`);
console.log("settings keys", keys.rows.map((r) => r.key));
await client.end();
