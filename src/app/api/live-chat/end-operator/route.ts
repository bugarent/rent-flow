import { NextResponse } from "next/server";
import { z } from "zod";
import { endOperatorSession } from "@/lib/server/live-chat/operator-queue";
import { getLiveChatSession } from "@/lib/server/live-chat/store";
import { getAdminSession } from "@/lib/auth/sessions";

const schema = z.object({
  sessionId: z.string().uuid(),
});

/** End operator chat (admin or customer). Promotes next in queue. */
export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const session = await getLiveChatSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Admin can always end; customers can end their own queued/active session
    const admin = await getAdminSession().catch(() => null);
    const isAdmin = Boolean(admin && admin.user.role === "ADMIN");
    if (
      !isAdmin &&
      session.operatorMode !== "active" &&
      session.operatorMode !== "queued"
    ) {
      return NextResponse.json({ error: "Not in operator queue" }, { status: 400 });
    }

    const result = await endOperatorSession(session.id);
    const updated = await getLiveChatSession(session.id);
    return NextResponse.json({
      ok: result.ended,
      promotedId: result.promotedId,
      messages: updated?.messages ?? [],
      operatorMode: updated?.operatorMode ?? "ended",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    console.error("[live-chat/end-operator]", error);
    return NextResponse.json({ error: "Could not end operator chat" }, { status: 500 });
  }
}
