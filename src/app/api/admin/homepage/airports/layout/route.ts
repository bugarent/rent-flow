import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  getPopularAirportsLayout,
  setPopularAirportsLayout,
} from "@/lib/server/homepage-airports-layout-store";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const schema = z.object({
  layout: z.enum(["grid", "slider"]),
});

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const layout = await getPopularAirportsLayout();
    return NextResponse.json({ layout });
  } catch (error) {
    console.error("[homepage/airports/layout GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load layout" },
      { status: 500 },
    );
  }
}

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
    const layout = await setPopularAirportsLayout(body.layout);
    return NextResponse.json({ layout });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid layout" },
        { status: 400 },
      );
    }
    console.error("[homepage/airports/layout PUT]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save layout" },
      { status: 500 },
    );
  }
}
