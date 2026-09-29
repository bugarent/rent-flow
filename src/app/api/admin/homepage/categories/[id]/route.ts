import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  deleteHomepageCategory,
  updateHomepageCategory,
} from "@/lib/server/homepage-categories-store";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const mappedModelSchema = z.object({
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
});

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  details: z.string().trim().max(2000).optional(),
  imageUrl: z.string().trim().min(1).optional(),
  mappedModels: z.array(mappedModelSchema).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const { id } = await params;
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const body = schema.parse(json);
    const row = await updateHomepageCategory(id, body);
    return NextResponse.json(row);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Could not update category";
    console.error("[homepage/categories PATCH]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const { id } = await params;
    await deleteHomepageCategory(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete category";
    console.error("[homepage/categories DELETE]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
