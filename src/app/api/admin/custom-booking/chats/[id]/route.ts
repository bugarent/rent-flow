import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import {
  addCustomBookingMessage,
  deleteCustomBookingChat,
  getCustomBookingChatById,
  markCustomBookingChatRead,
  publicChatView,
  updateCustomBookingChat,
} from "@/lib/server/custom-booking-chat-store";
import { unreadAdminCount } from "@/lib/catalog/custom-booking-chat";

type Ctx = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

const messageSchema = z.object({
  body: z.string().trim().max(4000).optional(),
  imageUrl: z.string().trim().min(1).optional(),
  carOffer: z.boolean().optional(),
});

const patchSchema = z.object({
  status: z.enum(["OPEN", "ACTIVE", "REJECTED", "COMPLETED", "CLOSED"]).optional(),
  bookingNote: z.string().trim().max(2000).optional(),
  selectedCarImageUrl: z.string().nullable().optional(),
  selectedCarNote: z.string().trim().max(500).optional(),
  carPhotos: z.array(z.string()).optional(),
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(4).max(40).optional(),
  pickupAt: z.string().datetime({ offset: true }).or(z.string().min(8)).nullable().optional(),
  dropoffAt: z.string().datetime({ offset: true }).or(z.string().min(8)).nullable().optional(),
  partnerListingId: z.string().trim().min(1).max(80).nullable().optional(),
  partnerListingLabel: z.string().trim().max(200).optional(),
  priceEur: z.number().nonnegative().nullable().optional(),
  commissionPercent: z.number().min(0).max(100).nullable().optional(),
});

export async function GET(_req: Request, ctx: Ctx) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const chat = await getCustomBookingChatById(id);
    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    await markCustomBookingChatRead({ chatId: chat.id, reader: "ADMIN" });
    const fresh = (await getCustomBookingChatById(id)) || chat;
    let partner: {
      id: string;
      companyName: string;
      phone: string;
      secondaryPhone: string | null;
      email: string;
      logoUrl: string | null;
      messengers: string[];
      carTitle: string;
      carMake: string;
      carModel: string;
      carYear: number;
      transmission: string;
      fuelType: string;
    } | null = null;

    if (fresh.partnerListingId) {
      try {
        const { prisma } = await import("@/lib/prisma");
        const { parsePartnerMessengers } = await import("@/lib/partner");
        const car = await prisma.car.findUnique({
          where: { id: fresh.partnerListingId },
          include: {
            partner: {
              select: {
                id: true,
                companyName: true,
                phone: true,
                secondaryPhone: true,
                email: true,
                logoUrl: true,
                messengers: true,
                messenger: true,
              },
            },
          },
        });
        if (car?.partner) {
          partner = {
            id: car.partner.id,
            companyName: car.partner.companyName,
            phone: car.partner.phone,
            secondaryPhone: car.partner.secondaryPhone,
            email: car.partner.email,
            logoUrl: car.partner.logoUrl,
            messengers: parsePartnerMessengers(car.partner.messengers, car.partner.messenger),
            carTitle: car.title,
            carMake: car.make,
            carModel: car.model,
            carYear: car.year,
            transmission: car.transmission,
            fuelType: car.fuelType,
          };
        }
      } catch (err) {
        console.warn("[admin/custom-booking/chats/:id] partner enrich failed", err);
      }
    }

    return NextResponse.json(
      {
        chat: { ...publicChatView(fresh), unreadCount: unreadAdminCount(fresh) },
        partner,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[admin/custom-booking/chats/:id GET]", error);
    return NextResponse.json({ error: "Could not load chat" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = messageSchema.parse(await req.json());
    if (!body.body?.trim() && !body.imageUrl) {
      return NextResponse.json({ error: "Message or image required" }, { status: 400 });
    }
    const chat = await getCustomBookingChatById(id);
    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    const updated = await addCustomBookingMessage({
      chatId: chat.id,
      sender: "ADMIN",
      body: body.body,
      imageUrl: body.imageUrl,
      carOffer: body.carOffer,
    });
    if (!updated) return NextResponse.json({ error: "Could not send" }, { status: 500 });
    return NextResponse.json({ chat: publicChatView(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid message" }, { status: 400 });
    }
    console.error("[admin/custom-booking/chats/:id POST]", error);
    return NextResponse.json({ error: "Could not send" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const body = patchSchema.parse(await req.json());
    const updated = await updateCustomBookingChat(id, body);
    if (!updated) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

    if (body.status === "ACTIVE") {
      const codes = [updated.code, updated.bookingRef].filter(Boolean).join(" · ");
      await addCustomBookingMessage({
        chatId: id,
        sender: "ADMIN",
        body: `Booking activated. Codes: ${codes}. Use either code in My Booking to view booking details.`,
      });
    }
    if (body.status === "REJECTED") {
      await addCustomBookingMessage({
        chatId: id,
        sender: "ADMIN",
        body: "Booking request was declined by our team.",
      });
    }
    if (body.status === "COMPLETED") {
      await addCustomBookingMessage({
        chatId: id,
        sender: "ADMIN",
        body: "Booking marked as completed.",
      });
    }

    const fresh = (await getCustomBookingChatById(id)) || updated;
    return NextResponse.json({ chat: publicChatView(fresh) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }
    console.error("[admin/custom-booking/chats/:id PATCH]", error);
    return NextResponse.json({ error: "Could not update" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const { id } = await ctx.params;
    const ok = await deleteCustomBookingChat(id);
    if (!ok) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/custom-booking/chats/:id DELETE]", error);
    return NextResponse.json({ error: "Could not delete" }, { status: 500 });
  }
}
