import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import { getHelpCenterConfig, saveHelpCenterConfig } from "@/lib/server/help-center-store";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const articleSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(8000),
  sortOrder: z.number().optional(),
  trending: z.boolean().optional(),
});

const topicSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(120),
  sortOrder: z.number().optional(),
  articles: z.array(articleSchema).max(80),
});

const categorySchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(120),
  sortOrder: z.number().optional(),
  topics: z.array(topicSchema).max(20),
});

const schema = z.object({
  categories: z.array(categorySchema).max(30),
});

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json(await getHelpCenterConfig());
  } catch (error) {
    console.error("[admin/help-center GET]", error);
    return NextResponse.json({ error: "Could not load help center" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const body = schema.parse(await req.json());
    const config = await saveHelpCenterConfig(body.categories);
    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid help center" }, { status: 400 });
    }
    console.error("[admin/help-center PUT]", error);
    return NextResponse.json({ error: "Could not save help center" }, { status: 500 });
  }
}
