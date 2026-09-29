import { NextResponse } from "next/server";
import { z } from "zod";
import { liveChatGreeting } from "@/lib/server/live-chat/openai";
import { createLiveChatSession, getLiveChatSession } from "@/lib/server/live-chat/store";
import { getQueuePosition } from "@/lib/server/live-chat/operator-queue";
import { isOperatorHours, operatorHoursLabel } from "@/lib/server/live-chat/operator-hours";

const createSchema = z.object({
  locale: z.string().trim().max(8).optional().default("en"),
});

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json().catch(() => ({})));
    const greeting = liveChatGreeting(body.locale);
    const session = await createLiveChatSession({ locale: body.locale, greeting });
    return NextResponse.json({
      sessionId: session.id,
      messages: session.messages,
      operatorMode: session.operatorMode,
      queuePosition: 0,
      operatorHoursOpen: isOperatorHours(),
      operatorHoursLabel: operatorHoursLabel(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    console.error("[live-chat/session]", error);
    return NextResponse.json({ error: "Could not start chat" }, { status: 500 });
  }
}

/** Poll session (queue promotion / operator replies). */
export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id")?.trim() || "";
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const session = await getLiveChatSession(id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    const queuePosition =
      session.operatorMode === "queued" || session.operatorMode === "active"
        ? await getQueuePosition(session.id)
        : 0;
    return NextResponse.json({
      sessionId: session.id,
      messages: session.messages,
      operatorMode: session.operatorMode,
      queuePosition,
      aiExhausted: session.aiExhausted,
      userRequestedOperator: session.userRequestedOperator,
      canOfferOperator:
        Boolean(session.aiExhausted && session.userRequestedOperator) &&
        session.operatorMode === "none" &&
        isOperatorHours(),
      operatorHoursOpen: isOperatorHours(),
      operatorHoursLabel: operatorHoursLabel(),
    });
  } catch (error) {
    console.error("[live-chat/session GET]", error);
    return NextResponse.json({ error: "Could not load session" }, { status: 500 });
  }
}
