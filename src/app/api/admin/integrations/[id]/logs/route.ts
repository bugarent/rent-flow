import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/sessions";
import { getIntegration, listLogs } from "@/lib/integrations/repository";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  if (!(await getIntegration(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const limit = Number(new URL(req.url).searchParams.get("limit") || 50);
  const logs = await listLogs(id, Math.min(200, Math.max(1, limit)));
  return NextResponse.json({ logs });
}
