import { NextResponse } from "next/server";
import { getTelegramVerifySession } from "@/lib/telegram/verification-store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim() || "";
  const email = searchParams.get("email")?.trim() || "";
  if (!code) {
    return NextResponse.json({ error: "Missing code", verified: false }, { status: 400 });
  }

  const session = await getTelegramVerifySession(code, email || undefined);
  if (!session) {
    return NextResponse.json({ verified: false, error: "Unknown or mismatched session" }, { status: 404 });
  }

  const expired = new Date(session.expiresAt).getTime() < Date.now();
  return NextResponse.json({
    verified: Boolean(session.verifiedAt && session.chatId && !expired && !session.consumedAt),
    expired,
    expiresAt: session.expiresAt,
  });
}
