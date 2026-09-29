import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import { loadAdminBookingRows } from "@/lib/server/load-admin-bookings";

export async function GET() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const bookings = await loadAdminBookingRows();
    return NextResponse.json(
      { bookings },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("[admin/bookings] GET", error);
    return NextResponse.json({ error: "Failed to load bookings" }, { status: 500 });
  }
}
