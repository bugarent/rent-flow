import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  createHomepageInfoBlock,
  getHomepageInfoContent,
  updateHomepageInfoHeadings,
} from "@/lib/server/homepage-info-blocks-store";
import { HOMEPAGE_INFO_ICON_KEYS } from "@/lib/catalog/homepage-info-icons";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const headingsSchema = z.object({
  whyTitle: z.string().trim().min(1).max(80).optional(),
  howTitle: z.string().trim().min(1).max(80).optional(),
  locale: z.string().trim().max(8).optional(),
});

const createSchema = z.object({
  section: z.enum(["why", "how"]),
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().max(500).optional(),
  iconKey: z.enum(HOMEPAGE_INFO_ICON_KEYS).optional(),
});

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const content = await getHomepageInfoContent();
    return NextResponse.json(content);
  } catch (error) {
    console.error("[homepage/info-blocks GET]", error);
    return NextResponse.json({ error: "Could not load info blocks" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const body = headingsSchema.parse(await req.json());
    const content = await updateHomepageInfoHeadings(body);
    return NextResponse.json(content);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid headings" }, { status: 400 });
    }
    console.error("[homepage/info-blocks PATCH]", error);
    return NextResponse.json({ error: "Could not update headings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const body = createSchema.parse(await req.json());
    const row = await createHomepageInfoBlock(body);
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid block" }, { status: 400 });
    }
    console.error("[homepage/info-blocks POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create block" },
      { status: 500 },
    );
  }
}
