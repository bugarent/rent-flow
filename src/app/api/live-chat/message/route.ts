import { NextResponse } from "next/server";
import { z } from "zod";
import { runLiveChatAi } from "@/lib/server/live-chat/openai";
import {
  appendLiveChatMessages,
  createLiveChatMessage,
  getLiveChatSession,
} from "@/lib/server/live-chat/store";
import {
  forwardOperatorCustomerMessage,
  getQueuePosition,
} from "@/lib/server/live-chat/operator-queue";
import { isOperatorHours, operatorHoursLabel } from "@/lib/server/live-chat/operator-hours";

const schema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().trim().min(1).max(4000),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const session = await getLiveChatSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const userMsg = createLiveChatMessage("user", body.message);
    const withUser = await appendLiveChatMessages(session.id, [userMsg]);
    if (!withUser) {
      return NextResponse.json({ error: "Session update failed" }, { status: 500 });
    }

    // Active operator chat — forward to Telegram, no AI
    if (withUser.operatorMode === "active") {
      await forwardOperatorCustomerMessage(withUser, body.message);
      return NextResponse.json({
        messages: withUser.messages,
        operatorMode: "active",
        queuePosition: 1,
        canOfferOperator: false,
        operatorHoursOpen: isOperatorHours(),
        operatorHoursLabel: operatorHoursLabel(),
      });
    }

    // Queued — remind position, keep AI optional for other topics
    if (withUser.operatorMode === "queued") {
      const position = await getQueuePosition(withUser.id);
      const waitMsg =
        withUser.locale === "ka"
          ? `ჯერ კიდევ რიგში ხართ: ${position}-ე. ოპერატორთან კომუნიკაცია დაიწყება, როცა წინა საუბარი დასრულდება.`
          : `You are still #${position} in the queue. Operator chat starts when the previous conversation ends.`;
      const next = await appendLiveChatMessages(withUser.id, [
        createLiveChatMessage("assistant", waitMsg),
      ]);
      return NextResponse.json({
        messages: next?.messages ?? withUser.messages,
        operatorMode: "queued",
        queuePosition: position,
        canOfferOperator: false,
        operatorHoursOpen: isOperatorHours(),
        operatorHoursLabel: operatorHoursLabel(),
      });
    }

    const ai = await runLiveChatAi({
      locale: withUser.locale,
      history: withUser.messages,
    });

    const assistantMsg = createLiveChatMessage("assistant", ai.reply);
    const next = await appendLiveChatMessages(withUser.id, [assistantMsg], {
      aiExhausted: withUser.aiExhausted || ai.exhausted,
      userRequestedOperator: withUser.userRequestedOperator || ai.userWantsOperator,
    });

    const canOfferOperator =
      Boolean(next?.aiExhausted && next?.userRequestedOperator) &&
      isOperatorHours() &&
      (next?.operatorMode === "none" || !next?.operatorMode);

    return NextResponse.json({
      messages: next?.messages ?? [],
      aiExhausted: next?.aiExhausted ?? false,
      userRequestedOperator: next?.userRequestedOperator ?? false,
      operatorMode: next?.operatorMode ?? "none",
      canOfferOperator,
      operatorHoursOpen: isOperatorHours(),
      operatorHoursLabel: operatorHoursLabel(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    console.error("[live-chat/message]", error);
    return NextResponse.json({ error: "Could not send message" }, { status: 500 });
  }
}
