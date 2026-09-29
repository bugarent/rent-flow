import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  createHomepageAirport,
  listHomepageAirports,
} from "@/lib/server/homepage-airports-store";
import { ensureHomepageDefaults } from "@/lib/server/homepage";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const schema = z.object({
  title: z.string().trim().min(1).max(120),
  iata: z.string().trim().min(2).max(8),
  imageUrl: z.string().trim().min(1),
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
    const rows = await listHomepageAirports();
    return NextResponse.json(Array.isArray(rows) ? rows : []);
  } catch (error) {
    console.error("[homepage/airports GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load airports" },
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
    const row = await createHomepageAirport({
      title: body.title,
      iata: body.iata,
      imageUrl: body.imageUrl,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid airport card" }, { status: 400 });
    }
    console.error("[homepage/airports POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create airport card" },
      { status: 500 },
    );
  }
}
