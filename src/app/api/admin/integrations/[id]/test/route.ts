import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/sessions";
import { testConnection } from "@/lib/integrations/sync-engine";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const result = await testConnection(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
