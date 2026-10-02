import { databaseHost } from "@/lib/database-url";

function errorText(error: unknown): string {
  if (!error || typeof error !== "object") return String(error ?? "");
  const err = error as { code?: string; message?: string; cause?: { code?: string; message?: string } };
  return [err.code, err.message, err.cause?.code, err.cause?.message].filter(Boolean).join(" ");
}

/**
 * Wrong credentials / pooler lockout. Retrying these on every request is what makes
 * Supabase (Supavisor) and Neon block the role with "too many authentication failures".
 */
export function isDbAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; errors?: unknown[]; cause?: { code?: string } };
  if (Array.isArray(err.errors) && err.errors.some(isDbAuthError)) return true;
  if (err.code === "28P01" || err.code === "28000" || err.code === "P1000") return true;
  if (err.cause?.code === "28P01" || err.cause?.code === "28000") return true;
  return /password authentication failed|too many authentication failures|authentication failed against database|tenant or user not found|role .* does not exist/i.test(
    errorText(error),
  );
}

/** Detect Prisma/pg connection failures (often shown as “Invalid findMany()”). */
export function isDbOfflineError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (isDbAuthError(error)) return true;
  const err = error as {
    code?: string;
    name?: string;
    message?: string;
    cause?: { code?: string; message?: string };
    meta?: { cause?: string };
    errors?: unknown[];
  };
  const parts = [
    err.code,
    err.name,
    err.message,
    err.cause?.code,
    err.cause?.message,
    err.meta?.cause,
    error instanceof Error ? error.stack : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (Array.isArray(err.errors)) {
    for (const nested of err.errors) {
      if (isDbOfflineError(nested)) return true;
    }
  }
  return (
    err.code === "ECONNREFUSED" ||
    err.code === "ETIMEDOUT" ||
    err.code === "P1001" ||
    err.code === "P1017" ||
    err.cause?.code === "ECONNREFUSED" ||
    err.cause?.code === "ETIMEDOUT" ||
    /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|Can't reach database|Connection refused|P1001|connect ECONNREFUSED|timeout expired|timeout exceeded when trying to connect|Connection terminated due to connection timeout|object null is not iterable/i.test(
      parts,
    )
  );
}

export function dbOfflineMessage(area: string): string {
  const host = databaseHost();
  const remote = host && host !== "localhost" && host !== "127.0.0.1";
  if (remote) {
    return `The online database did not answer in time while loading ${area}. Refresh the page — the site is already connected to the hosted database.`;
  }
  return `PostgreSQL is not reachable on localhost:5432 (ECONNREFUSED). Prisma reports this as an “Invalid findMany() invocation”, but the ${area} query relations match the schema. Start the DB (docker compose up -d or npm run db:up), run npx prisma db push, then refresh.`;
}

export function shortPrismaError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.split("\n").filter(Boolean).slice(0, 3).join(" ");
  }
  return "Could not load data from the database.";
}
