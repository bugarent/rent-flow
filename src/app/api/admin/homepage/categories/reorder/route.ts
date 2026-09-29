import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import { reorderHomepageCategories } from "@/lib/server/homepage-categories-store";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const schema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export async function PUT(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const body = schema.parse(json);
    const rows = await reorderHomepageCategories(body.orderedIds);
    return NextResponse.json(rows);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid reorder payload" }, { status: 400 });
    }
    console.error("[homepage/categories/reorder]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not reorder categories" },
      { status: 500 },
    );
  }
}
