/**
 * DATABASE_URL as the Postgres driver expects it.
 * Hosting dashboards often receive the whole `.env` line (`DATABASE_URL="postgresql://…"`)
 * or a quoted value; the driver then parses the host as `base` and every query fails.
 */
export function databaseUrl(): string {
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
