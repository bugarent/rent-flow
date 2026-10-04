import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import { previewPeriodPurge, runPeriodPurge } from "@/lib/server/admin-period-purge";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const schema = z.object({
  from: day,
  to: day,
  mode: z.enum(["bookings", "finances", "both"]),
  dryRun: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  try {
    const body = schema.parse(await req.json());
    const preview = await previewPeriodPurge(body.from, body.to);
    if (body.dryRun) return NextResponse.json({ preview });
    const result = await runPeriodPurge(body.from, body.to, body.mode);
    return NextResponse.json({ preview, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    console.error("[admin/bookings/period-purge]", error);
    return NextResponse.json({ error: "Could not delete" }, { status: 500 });
  }
}
