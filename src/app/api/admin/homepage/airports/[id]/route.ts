import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  deleteHomepageAirport,
  updateHomepageAirport,
} from "@/lib/server/homepage-airports-store";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const schema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  iata: z.string().trim().min(2).max(8).optional(),
  imageUrl: z.string().trim().min(1).optional(),
  infoText: z.string().trim().max(8000).optional(),
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
    const row = await updateHomepageAirport(id, body);
    return NextResponse.json(row);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid airport card" }, { status: 400 });
    }
    console.error("[homepage/airports PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update airport card" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const { id } = await params;
    await deleteHomepageAirport(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[homepage/airports DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete airport card" },
      { status: 500 },
    );
  }
}
