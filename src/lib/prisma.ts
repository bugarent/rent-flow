import { createRequire } from "node:module";
import type { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolClient } from "pg";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { databaseUrl } from "@/lib/database-url";

const CLIENT_REV = 10;
const DB_COOLDOWN_MS = 300_000; // 5 min — avoid hammering a dead Postgres on every navigation

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
  prismaRev?: number;
  dbOfflineUntil?: number;
};

function offlineError() {
  const error = new Error("connect ECONNREFUSED") as NodeJS.ErrnoException;
  error.code = "ECONNREFUSED";
  return error;
}

function markDbOffline(error?: unknown) {
  globalForPrisma.dbOfflineUntil = Date.now() + DB_COOLDOWN_MS;
  noteDbOfflineOnce("pool", error);
}

/** True while Postgres is known to be down, so callers can use file stores immediately. */
export function isDbCircuitOpen() {
  return Date.now() < (globalForPrisma.dbOfflineUntil ?? 0);
}

/** Let the next query reach the hosted database after a short timeout elsewhere. */
export function reopenDbCircuit() {
  globalForPrisma.dbOfflineUntil = 0;
}

/**
 * Mark Postgres unreachable for a short cooldown and log once.
 * Prefer this over noteDbOfflineOnce alone — logging without opening the circuit
 * keeps every request hammering a dead DB (AggregateError / hung navigations).
 */
export function markDbCircuitOpen(context: string, error?: unknown) {
  globalForPrisma.dbOfflineUntil = Date.now() + DB_COOLDOWN_MS;
  noteDbOfflineOnce(context, error);
}

function rejectOffline<T>(error: unknown): Promise<T> {
  if (isDbOfflineError(error)) markDbOffline(error);
  return Promise.reject(error);
}

/**
 * pg calls `connect` both as a promise and with a callback from inside `query`.
 * Wrapping every call as a promise makes the callback path return undefined and
 * throws `reading 'then'`, which keeps pages waiting on a dead database.
 */
function guardPool(pool: Pool) {
  const connect = pool.connect.bind(pool) as (...args: unknown[]) => unknown;
  const query = pool.query.bind(pool) as (...args: unknown[]) => unknown;

  pool.connect = ((...args: unknown[]) => {
    const hasCallback = typeof args[args.length - 1] === "function";
    const cb = hasCallback ? (args[args.length - 1] as (err: Error | undefined, client?: PoolClient) => void) : undefined;
    const rest = hasCallback ? args.slice(0, -1) : args;
    if (isDbCircuitOpen()) {
      const err = offlineError();
      if (cb) {
        queueMicrotask(() => cb(err));
        return undefined;
      }
      return Promise.reject(err);
    }
    if (cb) {
      return connect(...rest, (err: Error | undefined, client?: PoolClient) => {
        if (err && isDbOfflineError(err)) markDbOffline(err);
        cb(err, client);
      });
    }
    return Promise.resolve(connect(...rest)).then(
      (client) => client as PoolClient,
      (error: unknown) => rejectOffline(error),
    );
  }) as Pool["connect"];

  pool.query = ((...args: unknown[]) => {
    const hasCallback = typeof args[args.length - 1] === "function";
    if (isDbCircuitOpen()) {
      const err = offlineError();
      if (hasCallback) {
        const cb = args[args.length - 1] as (err: Error) => void;
        queueMicrotask(() => cb(err));
        return undefined;
      }
      return Promise.reject(err);
    }
    const pending = query(...args);
    if (pending && typeof (pending as Promise<unknown>).then === "function") {
      return (pending as Promise<unknown>).then(
        (value) => value,
        (error: unknown) => rejectOffline(error),
      );
    }
    return pending;
  }) as Pool["query"];

  pool.on("error", (error) => {
    if (isDbOfflineError(error)) markDbOffline(error);
  });
}

function unavailableClient(): PrismaClient {
  const fail = () => {
    throw new Error(
      "Prisma Client is not generated. Free disk space, install prisma@7.10.0, then run `npx prisma generate`.",
    );
  };
  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (prop === "$connect" || prop === "$disconnect") return async () => undefined;
      if (prop === "then") return undefined;
      return new Proxy(fail, {
        get: () => fail,
        apply: () => fail(),
      });
    },
  });
}

/** Hosted Postgres uses a self-signed chain. `pg` treats require/prefer as verify-full and then login never sees the User row. */
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

function envMs(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function createPrisma(): PrismaClient {
  const url = databaseUrl();
  if (!url) return unavailableClient();

  try {
    const nodeRequire = createRequire(process.cwd() + "/package.json");
    const { PrismaClient: Client } = nodeRequire("@prisma/client") as {
      PrismaClient: new (opts?: object) => PrismaClient;
    };
    let pool = globalForPrisma.pool;
    if (!pool) {
      const connectionString = connectionStringForPool(url);
      pool = new Pool({
        connectionString,
        ssl: /sslmode=no-verify/i.test(connectionString) ? { rejectUnauthorized: false } : undefined,
        // Fail fast when Postgres is down so pages fall back to file stores
        // instead of hanging until the browser shows "This page couldn't load".
        // A cold TLS handshake to a remote Supabase pooler needs more than 500 ms.
        connectionTimeoutMillis: envMs("DB_CONNECT_TIMEOUT_MS", 4_000),
        idleTimeoutMillis: 5_000,
        max: 3,
        query_timeout: envMs("DB_QUERY_TIMEOUT_MS", 8_000),
        statement_timeout: envMs("DB_QUERY_TIMEOUT_MS", 8_000),
      });
      guardPool(pool);
      globalForPrisma.pool = pool;
    }
    const adapter = new PrismaPg(pool);
    return new Client({
      adapter,
      log: ["warn"],
    });
  } catch {
    return unavailableClient();
  }
}

if (globalForPrisma.prismaRev !== CLIENT_REV) {
  const stalePool = globalForPrisma.pool;
  globalForPrisma.pool = undefined;
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaRev = CLIENT_REV;
  if (stalePool) void stalePool.end().catch(() => undefined);
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Once Postgres is confirmed unreachable, skip noisy Prisma error spam in logs. */
let dbOfflineLogged = false;
export function noteDbOfflineOnce(context: string, error?: unknown) {
  // Always open the circuit — callers historically only logged, which left pages
  // hammering a dead Postgres and hanging navigations.
  globalForPrisma.dbOfflineUntil = Date.now() + DB_COOLDOWN_MS;
  if (dbOfflineLogged) return;
  dbOfflineLogged = true;
  const msg = error instanceof Error ? error.message : String(error || "");
  console.warn(
    `[db] Postgres unreachable (${context}). Using .data file stores. ${msg.slice(0, 120)}`,
  );
}
