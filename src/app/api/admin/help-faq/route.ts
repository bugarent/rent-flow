import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import { getHelpFaqConfig, saveHelpFaqConfig } from "@/lib/server/help-faq-store";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const itemSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(5000),
  sortOrder: z.number().optional(),
});

const schema = z.object({
  items: z.array(itemSchema).max(100),
});

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json(await getHelpFaqConfig());
  } catch (error) {
    console.error("[admin/help-faq GET]", error);
    return NextResponse.json({ error: "Could not load help FAQ" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const body = schema.parse(await req.json());
    const config = await saveHelpFaqConfig(body.items);
    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid FAQ" }, { status: 400 });
    }
    console.error("[admin/help-faq PUT]", error);
    return NextResponse.json({ error: "Could not save help FAQ" }, { status: 500 });
  }
}
