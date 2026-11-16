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

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
const rows = await client.query(
  `SELECT a.iata, dp."priceEur"::float AS price
   FROM "CarDeliveryPrice" dp
   JOIN "DeliveryLocation" d ON d.id = dp."deliveryLocationId"
   LEFT JOIN "Airport" a ON a.id = d."airportId"
   WHERE dp."carId" = $1`,
  ["cmw4y202g002d09jt9wfgej5u"],
);
console.log(JSON.stringify(rows.rows));
await client.end();
