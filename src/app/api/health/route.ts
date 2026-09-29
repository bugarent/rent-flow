import { NextResponse } from "next/server";

/**
 * Lightweight readiness probe for load balancers / deploy checks.
 * Does not expose secrets. DB ping is best-effort.
 */
export async function GET() {
  const started = Date.now();
  let db: "ok" | "skip" | "error" = "skip";

  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    db = "ok";
  } catch {
    db = "error";
  }

  const body = {
    ok: db !== "error",
    service: "rentairportcars",
    db,
    ms: Date.now() - started,
    time: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: body.ok ? 200 : 503 });
}
