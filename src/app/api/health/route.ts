import { NextResponse } from "next/server";

/**
 * Lightweight readiness probe for load balancers / deploy checks.
 * Does not expose secrets. DB ping is best-effort.
 */
function errorSummary(error: unknown): string {
  const err = error as { code?: string; message?: string };
  const text = `${err?.code ?? ""} ${err?.message ?? String(error)}`;
  return text.replace(/postgres(ql)?:\/\/\S+/gi, "postgres://***").trim().slice(0, 160);
}

export async function GET() {
  const started = Date.now();
  let db: "ok" | "skip" | "error" = "skip";
  let dbError = "";
  let store: "ok" | "skip" | "error" = "skip";
  let storeError = "";
  const rawDatabaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  const hasDatabaseUrl = Boolean(rawDatabaseUrl);
  const databaseUrlNeedsCleanup =
    /^DATABASE_URL\s*=/i.test(rawDatabaseUrl) || /^["']/.test(rawDatabaseUrl) || /["']$/.test(rawDatabaseUrl);

  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    db = "ok";
  } catch (error) {
    db = "error";
    dbError = errorSummary(error);
  }

  if (hasDatabaseUrl) {
    try {
      const { pingJsonStore } = await import("@/lib/server/durable-fs");
      await pingJsonStore();
      store = "ok";
    } catch (error) {
      store = "error";
      storeError = errorSummary(error);
    }
  }

  const body = {
    ok: db !== "error",
    service: "rentairportcars",
    db,
    dbError: dbError || undefined,
    hasDatabaseUrl,
    databaseUrlNeedsCleanup: databaseUrlNeedsCleanup || undefined,
    store,
    storeError: storeError || undefined,
    ms: Date.now() - started,
    time: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: body.ok ? 200 : 503 });
}
