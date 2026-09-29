/** Detect Prisma/pg connection failures (often shown as “Invalid findMany()”). */
export function isDbOfflineError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
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
    /ECONNREFUSED|ETIMEDOUT|Can't reach database|Connection refused|P1001|connect ECONNREFUSED|timeout expired|timeout exceeded when trying to connect|Connection terminated due to connection timeout|object null is not iterable/i.test(
      parts,
    )
  );
}

export function dbOfflineMessage(area: string): string {
  return `PostgreSQL is not reachable on localhost:5432 (ECONNREFUSED). Prisma reports this as an “Invalid findMany() invocation”, but the ${area} query relations match the schema. Start the DB (docker compose up -d or npm run db:up), run npx prisma db push, then refresh.`;
}

export function shortPrismaError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.split("\n").filter(Boolean).slice(0, 3).join(" ");
  }
  return "Could not load data from the database.";
}
