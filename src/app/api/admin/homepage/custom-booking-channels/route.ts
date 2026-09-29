import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  getCustomBookingChannelsConfig,
  saveCustomBookingChannelsConfig,
} from "@/lib/server/custom-booking-channels-store";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const channelSchema = z.object({
  enabled: z.boolean(),
  contact: z.string().trim().max(200),
});

const schema = z.object({
  online: channelSchema,
  whatsapp: channelSchema,
  viber: channelSchema,
  telegram: channelSchema,
});

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    return NextResponse.json(await getCustomBookingChannelsConfig());
  } catch (error) {
    console.error("[custom-booking-channels GET]", error);
    return NextResponse.json({ error: "Could not load custom booking channels" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const body = schema.parse(await req.json());
    const config = await saveCustomBookingChannelsConfig(body);
    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("[custom-booking-channels PUT]", error);
    return NextResponse.json({ error: "Could not save custom booking channels" }, { status: 500 });
  }
}
