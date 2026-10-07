"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, UserRound, X } from "lucide-react";
import { ChatMessageThread } from "@/components/chat/chat-message-thread";
import { usePreferences } from "@/components/providers/preferences-context";
import { uiText } from "@/lib/i18n/ui-text";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  role: "assistant" | "user" | "system";
  content: string;
  createdAt: string;
};

type OperatorMode = "none" | "queued" | "active" | "ended";

const IDLE_MS = 90_000;

export function LiveChatPanel({ onClose }: { onClose: () => void }) {
  const { locale, dictionary } = usePreferences();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState("");
  const [canOfferOperator, setCanOfferOperator] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursLabel, setHoursLabel] = useState("");
  const [operatorMode, setOperatorMode] = useState<OperatorMode>("none");
  const [queuePosition, setQueuePosition] = useState(0);
  const [idlePrompt, setIdlePrompt] = useState(false);

  const lastActivityRef = useRef(0);
  const idlePromptRef = useRef(false);

  const bumpActivity = () => {
    lastActivityRef.current = Date.now();
    if (idlePromptRef.current) {
      idlePromptRef.current = false;
      setIdlePrompt(false);
    }
  };

  useEffect(() => {
    idlePromptRef.current = idlePrompt;
  }, [idlePrompt]);

  useEffect(() => {
    if (starting) return;
    if (!lastActivityRef.current) lastActivityRef.current = Date.now();
    const id = window.setInterval(() => {
      if (idlePromptRef.current) return;
      if (Date.now() - lastActivityRef.current >= IDLE_MS) {
        idlePromptRef.current = true;
        setIdlePrompt(true);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [starting]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStarting(true);
      setError("");
      try {
        const res = await fetch("/api/live-chat/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        });
        const data = (await res.json()) as {
          error?: string;
          sessionId?: string;
          messages?: Msg[];
          operatorHoursOpen?: boolean;
          operatorHoursLabel?: string;
          operatorMode?: OperatorMode;
        };
        if (!res.ok) throw new Error(data.error || "Could not start chat");
        if (cancelled) return;
        setSessionId(data.sessionId || null);
        setMessages(data.messages || []);
        setHoursOpen(Boolean(data.operatorHoursOpen));
        setHoursLabel(data.operatorHoursLabel || "");
        setOperatorMode(data.operatorMode || "none");
        lastActivityRef.current = Date.now();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  // Poll while queued/active so promotions & operator replies appear
  useEffect(() => {
    if (!sessionId) return;
    if (operatorMode !== "queued" && operatorMode !== "active") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/live-chat/session?id=${encodeURIComponent(sessionId)}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          messages?: Msg[];
          operatorMode?: OperatorMode;
          queuePosition?: number;
          canOfferOperator?: boolean;
        };
        if (!res.ok || cancelled) return;
        setMessages(data.messages || []);
        setOperatorMode(data.operatorMode || "none");
        setQueuePosition(data.queuePosition || 0);
        setCanOfferOperator(Boolean(data.canOfferOperator));
      } catch {
        /* ignore poll errors */
      }
    };
    const id = window.setInterval(() => void tick(), 4000);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sessionId, operatorMode]);

  const endChat = async () => {
    if (sessionId && (operatorMode === "active" || operatorMode === "queued")) {
      try {
        await fetch("/api/live-chat/end-operator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
      } catch {
        /* close anyway */
      }
    }
    onClose();
  };

  const continueChat = () => {
    idlePromptRef.current = false;
    setIdlePrompt(false);
    lastActivityRef.current = Date.now();
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !sessionId || busy) return;
    bumpActivity();
    setBusy(true);
    setError("");
    setInput("");
    try {
      const res = await fetch("/api/live-chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });
      const data = (await res.json()) as {
        error?: string;
        messages?: Msg[];
        canOfferOperator?: boolean;
        operatorHoursOpen?: boolean;
        operatorHoursLabel?: string;
        operatorMode?: OperatorMode;
        queuePosition?: number;
      };
      if (!res.ok) throw new Error(data.error || "Send failed");
      setMessages(data.messages || []);
      setCanOfferOperator(Boolean(data.canOfferOperator));
      setHoursOpen(Boolean(data.operatorHoursOpen));
      setHoursLabel(data.operatorHoursLabel || "");
      if (data.operatorMode) setOperatorMode(data.operatorMode);
      if (typeof data.queuePosition === "number") setQueuePosition(data.queuePosition);
      lastActivityRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const requestOperator = async () => {
    if (!sessionId || busy) return;
    bumpActivity();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/live-chat/request-operator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await res.json()) as {
        error?: string;
        messages?: Msg[];
        operatorMode?: OperatorMode;
        queuePosition?: number;
      };
      if (!res.ok) throw new Error(data.error || "Operator request failed");
      setMessages(data.messages || []);
      setCanOfferOperator(false);
      if (data.operatorMode) setOperatorMode(data.operatorMode);
      if (typeof data.queuePosition === "number") setQueuePosition(data.queuePosition);
      lastActivityRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const title = dictionary.common.onlineChat;
  const statusLine =
    operatorMode === "active"
      ? uiText(locale, "Connected to operator", "ოპერატორთან დაკავშირებული", "Подключено к оператору")
      : operatorMode === "queued"
        ? uiText(
            locale,
            `Queue #${queuePosition}`,
            `რიგი: ${queuePosition}-ე`,
            `Очередь: ${queuePosition}`,
          )
        : hoursOpen
          ? `Operator: ${hoursLabel}`
          : `AI · operator ${hoursLabel || "10:00–18:00"}`;

  const idleCopy =
    locale === "ka"
      ? { q: "გსურს საუბრის დასრულება?", yes: "დიახ", no: "არა" }
      : locale === "ru"
        ? { q: "Завершить разговор?", yes: "Да", no: "Нет" }
        : { q: "End this chat?", yes: "Yes", no: "No" };

  return (
    <div className="relative flex h-[min(520px,70vh)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(11,31,75,0.28)] ring-1 ring-slate-200">
      <div className="flex items-center justify-between bg-[#1d6fe8] px-4 py-3 text-white">
        <div>
          <p className="text-sm font-extrabold">{title}</p>
          <p className="text-[11px] text-white/80">{statusLine}</p>
        </div>
        <button
          type="button"
          className="rounded-md p-1.5 hover:bg-white/15"
          onClick={() => void endChat()}
          aria-label={dictionary.common.closeMenu}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col bg-[#f4f7fb] p-3"
        onPointerDown={bumpActivity}
        onKeyDown={bumpActivity}
      >
        {starting ? (
          <div className="flex flex-1 items-center justify-center text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ChatMessageThread
            messages={messages}
            className="min-h-0 flex-1 pr-1"
            renderMessage={(m) => (
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-line break-words rounded-2xl px-3 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-[#1d6fe8] text-white"
                    : "bg-white text-slate-800 ring-1 ring-slate-200",
                )}
              >
                {m.content}
              </div>
            )}
          />
        )}

        {canOfferOperator && operatorMode === "none" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void requestOperator()}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-[#1d6fe8] bg-white px-3 py-2 text-xs font-bold text-[#1d6fe8] hover:bg-sky-50"
          >
            <UserRound className="h-4 w-4" />
            {uiText(locale, "Connect to operator", "ოპერატორთან დაკავშირება", "Связаться с оператором")}
          </button>
        ) : null}

        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1d6fe8] focus:ring-2 focus:ring-[#1d6fe8]/20"
            placeholder={uiText(locale, "Type a message…", "დაწერეთ შეტყობინება…", "Напишите сообщение…")}
            value={input}
            disabled={busy || starting || !sessionId || idlePrompt}
            onChange={(e) => {
              bumpActivity();
              setInput(e.target.value);
            }}
          />
          <button
            type="submit"
            disabled={busy || starting || !sessionId || !input.trim() || idlePrompt}
            className="inline-flex items-center justify-center rounded-xl bg-[#1d6fe8] px-3 text-white disabled:bg-slate-400"
            aria-label="Send"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
      </div>

      {idlePrompt ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-[16rem] rounded-2xl bg-white p-4 text-center shadow-xl ring-1 ring-slate-200">
            <p className="text-sm font-bold text-[#0b1f4b]">{idleCopy.q}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={continueChat}
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                {idleCopy.no}
              </button>
              <button
                type="button"
                onClick={() => void endChat()}
                className="flex-1 rounded-xl bg-[#1d6fe8] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#1558c0]"
              >
                {idleCopy.yes}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
