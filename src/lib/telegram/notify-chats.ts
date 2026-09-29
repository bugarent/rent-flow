import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { normalizeLogin } from "@/lib/crypto";

const DATA_FILE = join(dataRoot(), "telegram-notify-chats.json");

type PartnerChat = {
  partnerId?: string;
  email?: string;
  chatId: string;
};

type StoreFile = {
  adminChatIds: string[];
  partners: PartnerChat[];
};

function emptyStore(): StoreFile {
  return { adminChatIds: [], partners: [] };
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return {
      adminChatIds: Array.isArray(parsed.adminChatIds)
        ? parsed.adminChatIds.map((id) => String(id).trim()).filter(Boolean)
        : [],
      partners: Array.isArray(parsed.partners) ? parsed.partners : [],
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: StoreFile) {
  await mkdir(dataRoot(), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

function uniq(ids: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const chatId = id.trim();
    if (!chatId || seen.has(chatId)) continue;
    seen.add(chatId);
    out.push(chatId);
  }
  return out;
}

export async function rememberAdminChat(chatId: string) {
  const id = chatId.trim();
  if (!id) return;
  const store = await readStore();
  store.adminChatIds = uniq([...store.adminChatIds, id]);
  await writeStore(store);
}

export async function rememberPartnerChat(input: {
  chatId: string;
  partnerId?: string | null;
  email?: string | null;
}) {
  const chatId = input.chatId.trim();
  if (!chatId) return;
  const partnerId = input.partnerId?.trim() || "";
  const email = input.email ? normalizeLogin(input.email) : "";
  const store = await readStore();
  store.partners = store.partners.filter((row) => {
    if (row.chatId === chatId && !partnerId && !email) return false;
    if (partnerId && row.partnerId === partnerId) return false;
    if (email && row.email && normalizeLogin(row.email) === email) return false;
    return true;
  });
  store.partners.push({
    chatId,
    ...(partnerId ? { partnerId } : {}),
    ...(email ? { email } : {}),
  });
  await writeStore(store);
}

export async function listStoredAdminChatIds(): Promise<string[]> {
  const store = await readStore();
  const fromEnv = (process.env.ADMIN_TELEGRAM_CHAT_ID || "")
    .split(/[,;\s]+/)
    .map((id) => id.trim())
    .filter(Boolean);
  return uniq([...store.adminChatIds, ...fromEnv]);
}

export async function listStoredPartnerChatIds(input: {
  partnerId?: string | null;
  email?: string | null;
}): Promise<string[]> {
  const store = await readStore();
  const partnerId = input.partnerId?.trim() || "";
  const email = input.email ? normalizeLogin(input.email) : "";
  return uniq(
    store.partners
      .filter((row) => {
        if (partnerId && row.partnerId === partnerId) return true;
        if (email && row.email && normalizeLogin(row.email) === email) return true;
        return false;
      })
      .map((row) => row.chatId),
  );
}
