import { NextResponse } from "next/server";
import { z } from "zod";
import { enqueueOperatorRequest } from "@/lib/server/live-chat/operator-queue";
import { getLiveChatSession } from "@/lib/server/live-chat/store";
import { isOperatorHours, operatorHoursLabel } from "@/lib/server/live-chat/operator-hours";
const schema = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const session = await getLiveChatSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!isOperatorHours()) {
      return NextResponse.json(
        {
          error: "Operator chat is available only during working hours.",
          operatorHoursOpen: false,
          operatorHoursLabel: operatorHoursLabel(),
        },
        { status: 403 },
      );
    }

    if (!session.aiExhausted || !session.userRequestedOperator) {
      return NextResponse.json(
        {
          error:
            "Operator handoff is only available after the assistant cannot answer and you request live help.",
        },
        { status: 403 },
      );
    }

    const result = await enqueueOperatorRequest(session.id);

    return NextResponse.json({
      ok: true,
      operatorMode: result.mode,
      queuePosition: result.position,
      notified: result.notified,
      messages: result.messages,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    console.error("[live-chat/request-operator]", error);
    return NextResponse.json({ error: "Could not request operator" }, { status: 500 });
  }
}
