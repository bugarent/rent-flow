import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  deleteHomepageInfoBlock,
  updateHomepageInfoBlock,
} from "@/lib/server/homepage-info-blocks-store";
import { HOMEPAGE_INFO_ICON_KEYS } from "@/lib/catalog/homepage-info-icons";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const schema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  body: z.string().trim().max(500).optional(),
  iconKey: z.enum(HOMEPAGE_INFO_ICON_KEYS).optional(),
  locale: z.string().trim().max(8).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const { id } = await params;
    const body = schema.parse(await req.json());
    const row = await updateHomepageInfoBlock(id, body);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid block" }, { status: 400 });
    }
    console.error("[homepage/info-blocks PATCH id]", error);
    return NextResponse.json({ error: "Could not update block" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const { id } = await params;
    await deleteHomepageInfoBlock(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[homepage/info-blocks DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete block" },
      { status: 500 },
    );
  }
}
