import "server-only";

import {
  mkdir as fsMkdir,
  readFile as fsReadFile,
  writeFile as fsWriteFile,
  access,
  rename,
  cp,
  readdir,
  stat,
} from "node:fs/promises";
import {
  existsSync as fsExistsSync,
  mkdirSync as fsMkdirSync,
  readFileSync as fsReadFileSync,
  writeFileSync as fsWriteFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { Pool } from "pg";
import { dataRoot, isServerlessHost, jsonStoreKey } from "@/lib/persistent-paths";
import { databaseUrl } from "@/lib/database-url";
import { isDbAuthError } from "@/lib/server/db-errors";

export { access, rename, cp, readdir, stat };

/** Retrying a rejected password on every read/write is what locks the role at the pooler. */
const AUTH_COOLDOWN_MS = 300_000;

let tableReady: Promise<void> | null = null;
let jsonPool: Pool | null = null;
let authBlockedUntil = 0;
let lastAuthError: unknown = null;

function noteStoreError(error: unknown) {
  if (!isDbAuthError(error)) return;
  authBlockedUntil = Date.now() + AUTH_COOLDOWN_MS;
  lastAuthError = error;
  const pool = jsonPool;
  jsonPool = null;
  tableReady = null;
  void pool?.end().catch(() => undefined);
}

function storeAuthBlocked() {
  return Date.now() < authBlockedUntil;
}

function connectionStringForPool(url: string) {
  if (!/[?&]sslmode=/i.test(url)) return url;
  const withoutSslMode = url
    .replace(/([?&])sslmode=[^&]*/gi, "$1")
    .replace(/[?&]$/, "")
    .replace(/\?&/, "?")
    .replace(/&&+/g, "&");
  const joiner = withoutSslMode.includes("?") ? "&" : "?";
  return `${withoutSslMode}${joiner}sslmode=no-verify`;
}

/** Own pool so a short page-load timeout cannot skip an admin/partner save. */
function storePool(): Pool | null {
  const url = databaseUrl();
  if (!url || storeAuthBlocked()) return null;
  if (!jsonPool) {
    const connectionString = connectionStringForPool(url);
    jsonPool = new Pool({
      connectionString,
      ssl: /sslmode=no-verify/i.test(connectionString) ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 10_000,
      query_timeout: 10_000,
      idleTimeoutMillis: 20_000,
      max: 2,
    });
    jsonPool.on("error", () => undefined);
  }
  return jsonPool;
}

async function ensureTable(pool: Pool): Promise<void> {
  if (!tableReady) {
    tableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS "JsonStore" (
          "key" TEXT NOT NULL,
          "payload" JSONB NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "JsonStore_pkey" PRIMARY KEY ("key")
        )`,
      )
      .then(() => undefined)
      .catch((error: unknown) => {
        tableReady = null;
        throw error;
      });
  }
  await tableReady;
}

export async function pingJsonStore(): Promise<void> {
  if (storeAuthBlocked() && lastAuthError) throw lastAuthError;
  const pool = storePool();
  if (!pool) throw new Error("DATABASE_URL is not set");
  try {
    await ensureTable(pool);
    await pool.query("SELECT 1");
  } catch (error) {
    noteStoreError(error);
    throw error;
  }
}

function looksLikeJsonText(data: unknown): data is string {
  if (typeof data !== "string") return false;
  const t = data.trimStart();
  return t.startsWith("{") || t.startsWith("[");
}

function parseJsonPayload(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

async function readFromDb(absPath: string): Promise<string | null> {
  const pool = storePool();
  if (!pool) return null;
  try {
    await ensureTable(pool);
    const result = await pool.query<{ payload: unknown }>(
      `SELECT "payload" FROM "JsonStore" WHERE "key" = $1 LIMIT 1`,
      [jsonStoreKey(absPath)],
    );
    const row = result.rows[0];
    if (!row) return null;
    return JSON.stringify(row.payload, null, 2);
  } catch (error) {
    noteStoreError(error);
    console.warn("[json-store] read failed", jsonStoreKey(absPath), error);
    return null;
  }
}

async function writeToDb(absPath: string, text: string): Promise<boolean> {
  if (!looksLikeJsonText(text)) return false;
  const pool = storePool();
  if (!pool) return false;
  const key = jsonStoreKey(absPath);
  const payload = JSON.stringify(parseJsonPayload(text));
  try {
    await ensureTable(pool);
    await pool.query(
      `INSERT INTO "JsonStore" ("key", "payload", "updatedAt")
       VALUES ($1, CAST($2 AS JSONB), CURRENT_TIMESTAMP)
       ON CONFLICT ("key") DO UPDATE
       SET "payload" = EXCLUDED."payload", "updatedAt" = CURRENT_TIMESTAMP`,
      [key, payload],
    );
    return true;
  } catch (error) {
    noteStoreError(error);
    console.warn("[json-store] write failed", key, error);
    return false;
  }
}

async function hydrateFile(absPath: string, text: string) {
  try {
    await fsMkdir(dirname(absPath), { recursive: true });
    await fsWriteFile(absPath, text, "utf8");
  } catch {
    /* read-only host */
  }
}

function isReadOnlyDeployPath(path: string): boolean {
  const n = path.replace(/\\/g, "/");
  return n === "/var/task" || n.startsWith("/var/task/") || isServerlessHost();
}

/** Read-only `/var/task` reports mkdir as ENOENT. Saving must continue into Postgres. */
function ignoreMkdirError(path: string, error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  if (code === "EEXIST") return true;
  if (code === "EROFS" || code === "EACCES" || code === "EPERM") return true;
  if (code === "ENOENT" || code === "ENOTDIR") return isReadOnlyDeployPath(path);
  return false;
}

export async function mkdir(path: string, options?: { recursive?: boolean }): Promise<string | undefined> {
  try {
    return await fsMkdir(path, options);
  } catch (error) {
    if (ignoreMkdirError(path, error)) {
      console.warn("[durable-fs] mkdir skipped", path, (error as NodeJS.ErrnoException).code);
      return undefined;
    }
    throw error;
  }
}

function preferDatabaseCopy(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  return isServerlessHost() || normalized.startsWith("/tmp/rentairportcars");
}

function textFromDbPayload(fromDb: string, encoding?: BufferEncoding): string | Buffer {
  if (!encoding || encoding === "utf8") return fromDb;
  return Buffer.from(fromDb, "utf8");
}

/**
 * On Netlify the JSON file in /tmp disappears between instances.
 * Prefer the Postgres copy there so admin settings see the last saved value.
 */
export async function readDurableText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

export async function readFile(path: string, encoding: "utf8"): Promise<string>;
export async function readFile(path: string, encoding?: BufferEncoding): Promise<string | Buffer>;
export async function readFile(path: string, encoding?: BufferEncoding): Promise<string | Buffer> {
  // Local files are read synchronously so a slow database call on the same page
  // cannot let the homepage timeout discard contact details and reviews.
  if (!preferDatabaseCopy(path)) {
    try {
      return encoding ? fsReadFileSync(path, encoding) : fsReadFileSync(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" && (error as NodeJS.ErrnoException).code !== "EACCES") {
        throw error;
      }
      const fromDb = await readFromDb(path);
      if (fromDb == null) throw error;
      void hydrateFile(path, fromDb);
      return textFromDbPayload(fromDb, encoding);
    }
  }

  const pending = readFromDb(path);
  const fromDb = await Promise.race([
    pending,
    new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 1200)),
  ]);
  if (fromDb != null) {
    void hydrateFile(path, fromDb);
    return textFromDbPayload(fromDb, encoding);
  }
  try {
    return encoding ? await fsReadFile(path, encoding) : await fsReadFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" && (error as NodeJS.ErrnoException).code !== "EACCES") {
      throw error;
    }
    // A cold Netlify instance has an empty /tmp. Wait for Postgres instead of
    // treating the saved homepage text as missing.
    const late = await pending;
    if (late != null) {
      void hydrateFile(path, late);
      return textFromDbPayload(late, encoding);
    }
    throw error;
  }
}

export async function writeFile(
  path: string,
  data: string | Buffer | Uint8Array,
  encoding?: BufferEncoding,
): Promise<void> {
  const text = typeof data === "string" ? data : Buffer.from(data).toString("utf8");
  let fileOk = false;
  try {
    await fsMkdir(dirname(path), { recursive: true });
    if (encoding) await fsWriteFile(path, data, encoding);
    else await fsWriteFile(path, data);
    fileOk = true;
  } catch (error) {
    console.warn("[durable-fs] file write failed", path, error);
  }
  const json = looksLikeJsonText(text);
  const dbOk = json ? await writeToDb(path, text) : false;
  if (dbOk) return;
  // /tmp on Netlify/Lambda disappears between instances. JSON must land in Postgres.
  const ephemeral = isReadOnlyDeployPath(path) || path.replace(/\\/g, "/").startsWith("/tmp/rentairportcars");
  if (fileOk && !(json && ephemeral)) return;
  throw new Error("Could not save changes.");
}

export function queueJsonMirror(absPath: string, value: unknown) {
  const text = JSON.stringify(value, null, 2);
  void writeToDb(absPath, text);
}

export function mkdirSync(path: string, options?: { recursive?: boolean }) {
  try {
    return fsMkdirSync(path, options);
  } catch (error) {
    if (ignoreMkdirError(path, error)) return path;
    throw error;
  }
}

export function writeFileSync(path: string, data: string | NodeJS.ArrayBufferView, encoding?: BufferEncoding) {
  const text = typeof data === "string" ? data : Buffer.from(data as Uint8Array).toString("utf8");
  try {
    fsMkdirSync(dirname(path), { recursive: true });
    if (encoding) fsWriteFileSync(path, data, encoding);
    else fsWriteFileSync(path, data);
  } catch (error) {
    console.warn("[durable-fs] sync file write failed", path, error);
    if (!looksLikeJsonText(text)) throw error;
  }
  if (looksLikeJsonText(text)) queueJsonMirror(path, parseJsonPayload(text));
}

export function readFileSync(path: string, encoding: BufferEncoding): string {
  try {
    return fsReadFileSync(path, encoding);
  } catch (error) {
    throw error;
  }
}

export function existsSync(path: string): boolean {
  return fsExistsSync(path);
}

let fileTableReady: Promise<void> | null = null;

async function ensureFileTable(pool: Pool): Promise<void> {
  if (!fileTableReady) {
    fileTableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS "HostedFile" (
          "key" TEXT NOT NULL,
          "contentType" TEXT NOT NULL,
          "bytes" BYTEA NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "HostedFile_pkey" PRIMARY KEY ("key")
        )`,
      )
      .then(() => undefined)
      .catch((error: unknown) => {
        fileTableReady = null;
        throw error;
      });
  }
  await fileTableReady;
}

/** Keep uploaded images in Postgres so Netlify's temporary disk does not drop them. */
export async function saveHostedFile(key: string, contentType: string, bytes: Buffer): Promise<boolean> {
  const pool = storePool();
  if (!pool) return false;
  try {
    await ensureFileTable(pool);
    await pool.query(
      `INSERT INTO "HostedFile" ("key", "contentType", "bytes", "updatedAt")
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT ("key") DO UPDATE
       SET "contentType" = EXCLUDED."contentType",
           "bytes" = EXCLUDED."bytes",
           "updatedAt" = CURRENT_TIMESTAMP`,
      [key, contentType, bytes],
    );
    return true;
  } catch (error) {
    noteStoreError(error);
    console.warn("[hosted-file] write failed", key, error);
    return false;
  }
}

export async function readHostedFile(
  key: string,
): Promise<{ contentType: string; bytes: Buffer } | null> {
  const pool = storePool();
  if (!pool) return null;
  try {
    await ensureFileTable(pool);
    const result = await pool.query<{ contentType: string; bytes: Buffer | Uint8Array }>(
      `SELECT "contentType", "bytes" FROM "HostedFile" WHERE "key" = $1 LIMIT 1`,
      [key],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      contentType: row.contentType,
      bytes: Buffer.isBuffer(row.bytes) ? row.bytes : Buffer.from(row.bytes),
    };
  } catch (error) {
    noteStoreError(error);
    console.warn("[hosted-file] read failed", key, error);
    return null;
  }
}

export async function hydrateJsonStoreFiles() {
  const pool = storePool();
  if (!pool) return;
  try {
    await ensureTable(pool);
    const result = await pool.query<{ key: string; payload: unknown }>(
      `SELECT "key", "payload" FROM "JsonStore"`,
    );
    const root = dataRoot();
    await fsMkdir(root, { recursive: true });
    for (const row of result.rows) {
      const dest = join(root, ...row.key.split("/").filter(Boolean));
      if (fsExistsSync(dest)) continue;
      await hydrateFile(dest, JSON.stringify(row.payload, null, 2));
    }
  } catch (error) {
    console.warn("[json-store] hydrate skipped", error);
  }
}
