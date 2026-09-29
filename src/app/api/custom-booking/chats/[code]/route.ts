import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addCustomBookingMessage,
  getCustomBookingChatByAnyRef,
  getCustomBookingChatByCode,
  markCustomBookingChatRead,
  publicChatView,
  selectCustomBookingCar,
} from "@/lib/server/custom-booking-chat-store";
import { parseCustomBookingCode } from "@/lib/catalog/custom-booking-chat";
import { parseBookingRef } from "@/lib/ids";

type Ctx = { params: Promise<{ code: string }> };

const lookupSchema = z.object({
  email: z.string().trim().email(),
});

const messageSchema = z.object({
  email: z.string().trim().email(),
  body: z.string().trim().max(4000).optional(),
  imageUrl: z.string().trim().optional(),
  selectCarImageUrl: z.string().trim().optional(),
  selectCarNote: z.string().trim().max(500).optional(),
});

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { code: codeParam } = await ctx.params;
    const email = new URL(req.url).searchParams.get("email") || "";
    const parsed = lookupSchema.safeParse({ email });
    if (!parsed.success) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const markRead = new URL(req.url).searchParams.get("markRead") !== "0";
    const ab = parseCustomBookingCode(codeParam);
    const chat = ab
      ? await getCustomBookingChatByCode(ab)
      : parseBookingRef(codeParam) != null
        ? await getCustomBookingChatByAnyRef(codeParam)
        : null;
    if (!chat || chat.email !== parsed.data.email.toLowerCase().trim()) {
      return NextResponse.json({ error: "We could not find a booking with those details." }, { status: 404 });
    }
    if (markRead) {
      await markCustomBookingChatRead({ chatId: chat.id, reader: "GUEST" });
    }
    const fresh = (await getCustomBookingChatByCode(chat.code)) || chat;
    return NextResponse.json({ chat: publicChatView(fresh) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[custom-booking/chats GET]", error);
    return NextResponse.json({ error: "Could not load chat" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { code: codeParam } = await ctx.params;
    const code = parseCustomBookingCode(codeParam);
    if (!code) {
      return NextResponse.json({ error: "Invalid tracking code" }, { status: 400 });
    }
    const body = messageSchema.parse(await req.json());
    const chat = await getCustomBookingChatByCode(code);
    if (!chat || chat.email !== body.email.toLowerCase().trim()) {
      return NextResponse.json({ error: "We could not find a custom booking with those details." }, { status: 404 });
    }

    if (body.selectCarImageUrl) {
      const updated = await selectCustomBookingCar({
        chatId: chat.id,
        imageUrl: body.selectCarImageUrl,
        note: body.selectCarNote,
      });
      if (!updated) return NextResponse.json({ error: "Could not select car" }, { status: 500 });
      return NextResponse.json({ chat: publicChatView(updated) });
    }

    if (!body.body?.trim() && !body.imageUrl) {
      return NextResponse.json({ error: "Message or image required" }, { status: 400 });
    }

    const updated = await addCustomBookingMessage({
      chatId: chat.id,
      sender: "GUEST",
      body: body.body,
      imageUrl: body.imageUrl,
    });
    if (!updated) {
      return NextResponse.json({ error: "Could not send message" }, { status: 500 });
    }
    return NextResponse.json({ chat: publicChatView(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid message" }, { status: 400 });
    }
    console.error("[custom-booking/chats POST message]", error);
    return NextResponse.json({ error: "Could not send message" }, { status: 500 });
  }
}
