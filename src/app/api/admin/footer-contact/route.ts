import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  getFooterContactConfig,
  saveFooterContactConfig,
} from "@/lib/server/footer-contact-store";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const schema = z.object({
  phone: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  inboxEmail: z.string().trim().max(160).optional().default(""),
  address: z.string().trim().max(200).optional().default(""),
});

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json(await getFooterContactConfig());
  } catch (error) {
    console.error("[admin/footer-contact GET]", error);
    return NextResponse.json({ error: "Could not load footer contact" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const body = schema.parse(await req.json());
    const config = await saveFooterContactConfig(body);
    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid contact" }, { status: 400 });
    }
    console.error("[admin/footer-contact PUT]", error);
    return NextResponse.json({ error: "Could not save footer contact" }, { status: 500 });
  }
}
