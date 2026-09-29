import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  getCustomBookingUnreadTotal,
  listCustomBookingChats,
} from "@/lib/server/custom-booking-chat-store";
import { unreadAdminCount } from "@/lib/catalog/custom-booking-chat";

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const chats = await listCustomBookingChats();
    const unreadTotal = await getCustomBookingUnreadTotal();
    return NextResponse.json(
      {
        unreadTotal,
        chats: chats.map((c) => ({
          id: c.id,
          code: c.code,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          phoneCountryIso2: c.phoneCountryIso2,
          status: c.status,
          channel: c.channel,
          selectedCarImageUrl: c.selectedCarImageUrl,
          selectedCarNote: c.selectedCarNote,
          bookingNote: c.bookingNote,
          pickupAt: c.pickupAt,
          dropoffAt: c.dropoffAt,
          partnerListingId: c.partnerListingId,
          partnerListingLabel: c.partnerListingLabel,
          bookingRef: c.bookingRef,
          priceEur: c.priceEur,
          commissionPercent: c.commissionPercent,
          activatedAt: c.activatedAt,
          completedAt: c.completedAt,
          createdAt: c.createdAt,
          lastMessageAt: c.lastMessageAt,
          unreadCount: unreadAdminCount(c),
          preview: c.messages[c.messages.length - 1]?.body ?? "",
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[admin/custom-booking/chats GET]", error);
    return NextResponse.json({ error: "Could not load chats" }, { status: 500 });
  }
}
