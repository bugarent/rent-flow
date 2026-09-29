import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  getLegalPagesConfig,
  saveLegalPagesConfig,
} from "@/lib/server/legal-pages-store";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const pageSchema = z.object({
  body: z.string().max(100_000).optional().default(""),
  fileUrl: z.string().max(2000).optional().default(""),
});

const schema = z.object({
  terms: pageSchema.optional(),
  privacy: pageSchema.optional(),
});

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json(await getLegalPagesConfig());
  } catch (error) {
    console.error("[admin/legal-pages GET]", error);
    return NextResponse.json({ error: "Could not load legal pages" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const body = schema.parse(await req.json());
    const config = await saveLegalPagesConfig(body);
    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid legal pages" },
        { status: 400 },
      );
    }
    console.error("[admin/legal-pages PUT]", error);
    return NextResponse.json({ error: "Could not save legal pages" }, { status: 500 });
  }
}
