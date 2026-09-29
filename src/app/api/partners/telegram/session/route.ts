import { NextResponse } from "next/server";
import { z } from "zod";
import { telegramBotDeepLink } from "@/lib/telegram/bot";
import { createTelegramVerifySession } from "@/lib/telegram/verification-store";

const schema = z.object({
  email: z.string().email(),
  telegramUsername: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^@?[A-Za-z0-9_]{3,32}$/, "Enter a valid Telegram username"),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const session = await createTelegramVerifySession({
      email: body.email,
      telegramUsername: body.telegramUsername,
    });
    return NextResponse.json({
      code: session.code,
      botUrl: telegramBotDeepLink(session.code),
      expiresAt: session.expiresAt,
      verified: false,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid data", code: "INVALID" },
        { status: 400 },
      );
    }
    console.error("[partners/telegram/session]", error);
    return NextResponse.json({ error: "Could not start Telegram verification", code: "SERVER" }, { status: 500 });
  }
}
