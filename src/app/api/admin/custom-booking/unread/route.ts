import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import { getCustomBookingUnreadTotal } from "@/lib/server/custom-booking-chat-store";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const unreadTotal = await getCustomBookingUnreadTotal();
    return NextResponse.json(
      { unreadTotal },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[admin/custom-booking/unread]", error);
    return NextResponse.json({ unreadTotal: 0 });
  }
}
