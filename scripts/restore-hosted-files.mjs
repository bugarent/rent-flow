/**
 * Put backed-up images back into the HostedFile table after a restore.
 * Only inserts keys that are missing; existing rows are never overwritten.
 *
 * Usage: node --env-file=.env scripts/restore-hosted-files.mjs [folder]
 *   folder defaults to .backups/_hosted-files
 */
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import pg from "pg";

const TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

const root = process.argv[2] || join(process.cwd(), ".backups", "_hosted-files");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const pool = new pg.Pool({
  connectionString: databaseUrl.replace(/([?&])sslmode=[^&]*/gi, "$1").replace(/[?&]$/, ""),
  ssl: { rejectUnauthorized: false },
  max: 2,
});

let inserted = 0;
let skipped = 0;
try {
  const existing = new Set((await pool.query(`SELECT "key" FROM "HostedFile"`)).rows.map((r) => r.key));
  for await (const path of walk(root)) {
    const key = relative(root, path).split(sep).join("/");
    if (existing.has(key)) {
      skipped += 1;
      continue;
    }
    const contentType = TYPES[extname(path).toLowerCase()] || "application/octet-stream";
    await pool.query(
      `INSERT INTO "HostedFile" ("key", "contentType", "bytes", "updatedAt")
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP) ON CONFLICT ("key") DO NOTHING`,
      [key, contentType, await readFile(path)],
    );
    inserted += 1;
  }
  console.log(`Restored ${inserted} files, ${skipped} already present.`);
} finally {
  await pool.end();
}
