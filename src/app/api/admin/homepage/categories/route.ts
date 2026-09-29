import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import { summarizeMappedModels } from "@/lib/cars/category-mapping";
import {
  createHomepageCategory,
  listHomepageCategories,
} from "@/lib/server/homepage-categories-store";
import { ensureHomepageDefaults } from "@/lib/server/homepage";

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
  name: z.string().trim().min(1).max(80),
  details: z.string().trim().max(2000).optional(),
  imageUrl: z.string().trim().min(1),
  slug: z.string().trim().min(1).max(40).optional(),
  mappedModels: z.array(mappedModelSchema).default([]),
});

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    try {
      await ensureHomepageDefaults();
    } catch {
      /* DB may be offline — file store still works */
    }
    const rows = await listHomepageCategories();
    return NextResponse.json(Array.isArray(rows) ? rows : []);
  } catch (error) {
    console.error("[homepage/categories GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load categories" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
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
    const mappedModels = body.mappedModels ?? [];
    const details = body.details?.trim() || summarizeMappedModels(mappedModels) || body.name;
    const row = await createHomepageCategory({
      name: body.name,
      details,
      imageUrl: body.imageUrl,
      mappedModels,
      slug: body.slug,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid category" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Could not create category";
    console.error("[homepage/categories POST]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
