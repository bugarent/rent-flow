import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import type { TelegramLiveBot } from "@/lib/catalog/telegram-live-bots";
import {
  botsForAdminUi,
  getTelegramLiveBotsConfig,
  saveTelegramLiveBotsConfig,
} from "@/lib/server/telegram-live-bots-store";

const botSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  label: z.string().trim().max(80).optional().default(""),
  botUsername: z.string().trim().max(64).optional().default(""),
  botToken: z.string().trim().max(200).optional().default(""),
  chatId: z.string().trim().max(64),
  active: z.boolean().optional().default(false),
  botTokenSet: z.boolean().optional(),
});

const putSchema = z.object({
  bots: z.array(botSchema).max(20),
});

export async function GET() {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  try {
    const config = await getTelegramLiveBotsConfig();
    return NextResponse.json(botsForAdminUi(config));
  } catch (error) {
    console.error("[admin/telegram-live-bots GET]", error);
    return NextResponse.json({ error: "Could not load bots" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  try {
    const body = putSchema.parse(await req.json());
    const current = await getTelegramLiveBotsConfig();
    const byId = new Map(current.bots.map((b) => [b.id, b]));
    const now = new Date().toISOString();

    let activeCount = 0;
    const bots: TelegramLiveBot[] = body.bots.map((row, index) => {
      const prev = row.id ? byId.get(row.id) : undefined;
      const token = row.botToken.trim() || prev?.botToken || "";
      const active = Boolean(row.active);
      if (active) activeCount += 1;
      return {
        id: row.id || prev?.id || `bot-${Date.now()}-${index}`,
        label: row.label.trim() || (row.botUsername || "").trim().replace(/^@/, "") || `Bot ${index + 1}`,
        botUsername: (row.botUsername || "").trim().replace(/^@/, ""),
        botToken: token,
        chatId: row.chatId.trim(),
        active,
        createdAt: prev?.createdAt || now,
        updatedAt: now,
      };
    });

    // Keep only the first active bot
    if (activeCount > 1) {
      let keep = true;
      for (const b of bots) {
        if (!b.active) continue;
        if (keep) {
          keep = false;
          continue;
        }
        b.active = false;
      }
    }

    for (const b of bots) {
      if (b.active && (!b.botToken.trim() || !b.chatId.trim())) {
        return NextResponse.json(
          { error: "Active bot needs both Bot Token and Chat ID" },
          { status: 400 },
        );
      }
    }

    const saved = await saveTelegramLiveBotsConfig({ bots });
    return NextResponse.json(botsForAdminUi(saved));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid" }, { status: 400 });
    }
    console.error("[admin/telegram-live-bots PUT]", error);
    return NextResponse.json({ error: "Could not save bots" }, { status: 500 });
  }
}
