import { dataRoot } from "@/lib/persistent-paths";
import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "@/lib/server/durable-fs";
import { join } from "node:path";

export type LiveChatRole = "assistant" | "user" | "system";

export type OperatorMode = "none" | "queued" | "active" | "ended";

export type LiveChatMessage = {
  id: string;
  role: LiveChatRole;
  content: string;
  createdAt: string;
};

export type LiveChatSession = {
  id: string;
  locale: string;
  messages: LiveChatMessage[];
  /** AI indicated it cannot answer and suggested operator. */
  aiExhausted: boolean;
  /** User explicitly asked for a human. */
  userRequestedOperator: boolean;
  operatorRequestedAt: string | null;
  operatorNotified: boolean;
  /** Operator handoff queue state. */
  operatorMode: OperatorMode;
  queueJoinedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type StoreFile = { sessions: LiveChatSession[] };

const DATA_DIR = dataRoot();
const DATA_FILE = join(DATA_DIR, "live-chat-sessions.json");
const MAX_SESSIONS = 200;
const MAX_MESSAGES = 40;

function normalizeSession(raw: Partial<LiveChatSession>): LiveChatSession {
  const mode = raw.operatorMode;
  const operatorMode: OperatorMode =
    mode === "queued" || mode === "active" || mode === "ended" || mode === "none" ? mode : "none";
  return {
    id: String(raw.id || randomUUID()),
    locale: String(raw.locale || "en"),
    messages: Array.isArray(raw.messages) ? raw.messages : [],
    aiExhausted: Boolean(raw.aiExhausted),
    userRequestedOperator: Boolean(raw.userRequestedOperator),
    operatorRequestedAt: raw.operatorRequestedAt ? String(raw.operatorRequestedAt) : null,
    operatorNotified: Boolean(raw.operatorNotified),
    operatorMode,
    queueJoinedAt: raw.queueJoinedAt ? String(raw.queueJoinedAt) : null,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
  };
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreFile>;
    return {
      sessions: Array.isArray(parsed.sessions)
        ? parsed.sessions.map((s) => normalizeSession(s as Partial<LiveChatSession>))
        : [],
    };
  } catch {
    return { sessions: [] };
  }
}

async function writeStore(store: StoreFile) {
  await mkdir(DATA_DIR, { recursive: true });
  const trimmed = {
    sessions: store.sessions
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_SESSIONS),
  };
  await writeFile(DATA_FILE, JSON.stringify(trimmed, null, 2), "utf8");
}

export function createLiveChatMessage(role: LiveChatRole, content: string): LiveChatMessage {
  return {
    id: randomUUID(),
    role,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
}

export async function createLiveChatSession(input: {
  locale: string;
  greeting: string;
}): Promise<LiveChatSession> {
  const now = new Date().toISOString();
  const session: LiveChatSession = {
    id: randomUUID(),
    locale: input.locale || "en",
    messages: [createLiveChatMessage("assistant", input.greeting)],
    aiExhausted: false,
    userRequestedOperator: false,
    operatorRequestedAt: null,
    operatorNotified: false,
    operatorMode: "none",
    queueJoinedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const store = await readStore();
  store.sessions.unshift(session);
  await writeStore(store);
  return session;
}

export async function getLiveChatSession(id: string): Promise<LiveChatSession | null> {
  const store = await readStore();
  return store.sessions.find((s) => s.id === id) ?? null;
}

export async function listLiveChatSessions(): Promise<LiveChatSession[]> {
  const store = await readStore();
  return store.sessions;
}

type SessionPatch = Partial<
  Pick<
    LiveChatSession,
    | "aiExhausted"
    | "userRequestedOperator"
    | "operatorRequestedAt"
    | "operatorNotified"
    | "operatorMode"
    | "queueJoinedAt"
  >
>;

export async function appendLiveChatMessages(
  id: string,
  messages: LiveChatMessage[],
  patch?: SessionPatch,
): Promise<LiveChatSession | null> {
  const store = await readStore();
  const idx = store.sessions.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  const prev = store.sessions[idx]!;
  const next: LiveChatSession = {
    ...prev,
    ...patch,
    messages: [...prev.messages, ...messages].slice(-MAX_MESSAGES),
    updatedAt: new Date().toISOString(),
  };
  store.sessions[idx] = next;
  await writeStore(store);
  return next;
}

export async function patchLiveChatSession(
  id: string,
  patch: SessionPatch,
): Promise<LiveChatSession | null> {
  const store = await readStore();
  const idx = store.sessions.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  const prev = store.sessions[idx]!;
  const next: LiveChatSession = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  store.sessions[idx] = next;
  await writeStore(store);
  return next;
}
