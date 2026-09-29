import { NextResponse } from "next/server";
import { z } from "zod";
import { DIAL_CODES, formatInternationalPhone, nationalDigits } from "@/lib/catalog/dial-codes";
import {
  createCustomBookingChat,
  publicChatView,
} from "@/lib/server/custom-booking-chat-store";

const schema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  phoneNational: z.string().trim().min(4).max(30),
  phoneCountryIso2: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase())
    .refine((iso2) => Boolean(DIAL_CODES[iso2]), "Invalid country code"),
  channel: z.enum(["online", "whatsapp", "viber", "telegram"]).optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const phone =
      formatInternationalPhone(body.phoneCountryIso2, nationalDigits(body.phoneNational)) ||
      body.phoneNational;
    if (nationalDigits(body.phoneNational).length < 6) {
      return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
    }
    const chat = await createCustomBookingChat({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone,
      phoneCountryIso2: body.phoneCountryIso2,
      channel: body.channel || "online",
    });
    return NextResponse.json({ chat: publicChatView(chat) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
    }
    console.error("[custom-booking/chats POST]", error);
    return NextResponse.json({ error: "Could not start custom booking" }, { status: 500 });
  }
}
