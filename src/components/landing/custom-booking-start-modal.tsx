"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ImagePlus, MessageCircle, Minus, X } from "lucide-react";
import { PhoneCountryField } from "@/components/partner/phone-country-field";
import { usePreferences } from "@/components/providers/preferences-context";
import { cn } from "@/lib/utils";
import { formatInternationalPhone } from "@/lib/catalog/dial-codes";
import { WHATSAPP_NUMBER } from "@/lib/brand";
import {
  getGuestChatSoundId,
  playChatSound,
} from "@/lib/chat-notification-sound";
import {
  buildCustomBookingChannelHref,
  enabledCustomBookingChannels,
  type CustomBookingChannelKey,
  type CustomBookingChannelsConfig,
} from "@/lib/catalog/custom-booking-channels";
import { ChatMessageThread } from "@/components/chat/chat-message-thread";

type ChatMessage = {
  id: string;
  sender: "GUEST" | "ADMIN";
  body: string;
  createdAt: string;
  readByGuest?: boolean;
  readByAdmin?: boolean;
  imageUrl?: string;
  carOffer?: boolean;
};

type ChatView = {
  id: string;
  code: string;
  status: string;
  channel?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  unreadGuestCount?: number;
  selectedCarImageUrl?: string | null;
  selectedCarNote?: string;
  bookingNote?: string;
  messages: ChatMessage[];
};

type PersistedSession = {
  code: string;
  email: string;
  minimized: boolean;
  offset: { x: number; y: number };
};

const STORAGE_KEY = "rac_custom_booking_chat_session";
const LONG_PRESS_MS = 350;
const POLL_MS = 8000;

function readSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed?.code || !parsed?.email) return null;
    return {
      code: String(parsed.code),
      email: String(parsed.email),
      minimized: Boolean(parsed.minimized),
      offset: {
        x: Number(parsed.offset?.x) || 0,
        y: Number(parsed.offset?.y) || 0,
      },
    };
  } catch {
    return null;
  }
}

function writeSession(session: PersistedSession | null) {
  try {
    if (!session) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota / private mode */
  }
}

function WhatsAppLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.04 2c-5.46 0-9.91 4.44-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.44 17.5 2 12.04 2zm5.79 14.09c-.24.68-1.4 1.25-1.94 1.33-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.83-4.21-4.98-4.41-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.26-.28.58-.35.77-.35h.55c.18 0 .42-.07.66.5.24.59.82 2.02.89 2.16.07.14.12.31.02.5-.1.2-.14.31-.28.48-.14.16-.3.37-.42.49-.14.14-.28.29-.12.56.16.28.7 1.16 1.5 1.88 1.04.92 1.91 1.21 2.18 1.35.28.14.44.12.6-.07.16-.2.7-.82.89-1.1.18-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.46.21.53.33.07.12.07.68-.17 1.36z"
      />
    </svg>
  );
}

function ViberLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.04 2C7.4 2 4.1 5.08 4.1 9.4c0 2.18.9 4.15 2.35 5.55L5.2 22l5.28-2.76c.5.07 1.02.11 1.56.11 4.64 0 8.4-3.08 8.4-7.95C20.44 5.08 16.68 2 12.04 2zm3.7 11.35c-.18.5-.88.95-1.24 1.01-.32.06-.72.08-1.16-.07-.27-.08-.61-.2-1.06-.39-1.86-.8-3.08-2.69-3.17-2.81-.1-.13-.75-1-.75-1.91 0-.9.48-1.35.65-1.54.16-.18.37-.22.49-.22h.35c.11 0 .27-.04.42.32.15.38.52 1.29.57 1.38.04.09.08.2.01.32-.06.13-.09.2-.18.3-.09.11-.19.23-.27.31-.09.09-.18.18-.08.36.1.18.45.74.96 1.2.66.59 1.22.77 1.39.86.18.09.28.07.38-.05.1-.12.45-.52.57-.7.12-.18.23-.15.4-.09.16.06 1.04.49 1.22.58.18.09.29.13.34.21.04.08.04.43-.11.87z"
      />
    </svg>
  );
}

function TelegramLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.94 4.36 18.7 19.64c-.24 1.08-.88 1.35-1.78.84l-4.92-3.63-2.37 2.28c-.26.26-.48.48-.99.48l.35-5.02 9.14-8.26c.4-.35-.09-.55-.62-.2L6.27 13.3 1.41 11.78c-1.05-.33-1.07-1.05.22-1.56L20.53 3.3c.88-.33 1.65.2 1.41 1.06z"
      />
    </svg>
  );
}

const CHANNEL_META: Record<
  CustomBookingChannelKey,
  { label?: string; className: string; Icon: () => ReactNode }
> = {
  online: {
    className: "bg-[#22c55e] text-white",
    Icon: () => <MessageCircle className="h-5 w-5" />,
  },
  whatsapp: {
    label: "WhatsApp",
    className: "bg-[#25D366] text-white",
    Icon: WhatsAppLogo,
  },
  viber: {
    label: "Viber",
    className: "bg-[#7360F2] text-white",
    Icon: ViberLogo,
  },
  telegram: {
    label: "Telegram",
    className: "bg-[#2AABEE] text-white",
    Icon: TelegramLogo,
  },
};

export function CustomBookingStartModal({
  open,
  onClose,
  channels,
}: {
  open: boolean;
  onClose: () => void;
  channels: CustomBookingChannelsConfig;
}) {
  const { dictionary } = usePreferences();
  const cb = dictionary.home;
  const available = useMemo(() => enabledCustomBookingChannels(channels), [channels]);
  const channelLabel = useCallback(
    (key: CustomBookingChannelKey) =>
      key === "online" ? cb.customOnlineChat : CHANNEL_META[key].label || key,
    [cb.customOnlineChat],
  );
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneIso2: "GE",
    phoneNational: "",
  });
  const [channel, setChannel] = useState<CustomBookingChannelKey | "">("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState<ChatView | null>(null);
  const [reply, setReply] = useState("");
  const [mounted, setMounted] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastAdminMsgIdRef = useRef<string | null>(null);
  const soundReadyRef = useRef(false);
  const openPrevRef = useRef(false);

  const dragRef = useRef<{
    pressTimer: number | null;
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    pressTimer: null,
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const persist = useCallback((nextChat: ChatView | null, nextMinimized: boolean, nextOffset: { x: number; y: number }) => {
    if (!nextChat) {
      writeSession(null);
      return;
    }
    writeSession({
      code: nextChat.code,
      email: nextChat.email,
      minimized: nextMinimized,
      offset: nextOffset,
    });
  }, []);

  const loadChat = useCallback(async (code: string, email: string, markRead: boolean) => {
    const qs = new URLSearchParams({ email });
    if (!markRead) qs.set("markRead", "0");
    const res = await fetch(
      `/api/custom-booking/chats/${encodeURIComponent(code)}?${qs.toString()}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || cb.customCouldNotStart);
    return data.chat as ChatView;
  }, [cb.customCouldNotStart]);

  const applyChatUpdate = useCallback(
    (fresh: ChatView, options?: { playSound?: boolean; markAsSeenBaseline?: boolean }) => {
      const adminMessages = fresh.messages.filter((m) => m.sender === "ADMIN");
      const latestAdmin = adminMessages[adminMessages.length - 1];
      const unread =
        typeof fresh.unreadGuestCount === "number"
          ? fresh.unreadGuestCount
          : adminMessages.filter((m) => m.readByGuest === false).length;

      if (options?.markAsSeenBaseline) {
        lastAdminMsgIdRef.current = latestAdmin?.id ?? null;
        soundReadyRef.current = true;
      } else if (soundReadyRef.current && options?.playSound && latestAdmin?.id) {
        if (latestAdmin.id !== lastAdminMsgIdRef.current) {
          playChatSound(getGuestChatSoundId());
        }
        lastAdminMsgIdRef.current = latestAdmin.id;
      }

      setUnreadCount(unread);
      setChat(fresh);
    },
    [],
  );

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    (async () => {
      const saved = readSession();
      if (!saved) {
        if (!cancelled) setRestoring(false);
        return;
      }
      // Keep collapsed across reload — never auto-expand on restore.
      if (!cancelled) {
        setMinimized(Boolean(saved.minimized));
        setOffset(saved.offset);
      }
      try {
        const restored = await loadChat(saved.code, saved.email, !saved.minimized);
        if (cancelled) return;
        applyChatUpdate(restored, { markAsSeenBaseline: true });
        setMinimized(Boolean(saved.minimized));
        setOffset(saved.offset);
        persist(restored, Boolean(saved.minimized), saved.offset);
      } catch {
        if (!cancelled) writeSession(null);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadChat, applyChatUpdate, persist]);

  useEffect(() => {
    const wasOpen = openPrevRef.current;
    openPrevRef.current = open;
    // Expand only when the user explicitly opens the launcher (false → true).
    if (!open || wasOpen) return;
    setError("");
    setFieldErrors({});
    setConfirmEnd(false);
    if (chat) {
      setMinimized(false);
      persist(chat, false, offset);
      return;
    }
    setReply("");
    setOffset({ x: 0, y: 0 });
    setChannel(available.length === 1 ? available[0] : "");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- open edge only

  const minimizeChat = () => {
    if (!chat) return;
    setMinimized(true);
    setConfirmEnd(false);
    persist(chat, true, offset);
    onClose();
  };

  useEffect(() => {
    if (!open || chat) return;
    setChannel(available.length === 1 ? available[0] : "");
  }, [open, available, chat]);

  useEffect(() => {
    if (chat) persist(chat, minimized, offset);
  }, [chat, minimized, offset, persist]);

  useEffect(() => {
    if (!chat) return;
    const tick = () => {
      void loadChat(chat.code, chat.email, !minimized)
        .then((fresh) =>
          applyChatUpdate(fresh, {
            playSound: true,
            markAsSeenBaseline: !soundReadyRef.current,
          }),
        )
        .catch(() => {
          /* keep current view */
        });
    };
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [chat?.code, chat?.email, minimized, loadChat, applyChatUpdate]);

  useEffect(() => {
    if (!chat || minimized) return;
    void loadChat(chat.code, chat.email, true)
      .then((fresh) => applyChatUpdate(fresh, { markAsSeenBaseline: true }))
      .catch(() => undefined);
  }, [minimized]); // eslint-disable-line react-hooks/exhaustive-deps -- mark read when restored

  useEffect(() => {
    const blockPage = (open || Boolean(chat)) && !minimized;
    if (!blockPage) {
      document.body.style.overflow = "";
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, chat, minimized]);

  useEffect(() => {
    const clearPress = () => {
      const d = dragRef.current;
      if (d.pressTimer != null) {
        window.clearTimeout(d.pressTimer);
        d.pressTimer = null;
      }
    };

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active) return;
      e.preventDefault();
      setOffset({
        x: d.originX + (e.clientX - d.startX),
        y: d.originY + (e.clientY - d.startY),
      });
    };

    const onUp = () => {
      clearPress();
      dragRef.current.active = false;
      setDragging(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      clearPress();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const beginLongPressDrag = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, label")) return;

    const d = dragRef.current;
    if (d.pressTimer != null) window.clearTimeout(d.pressTimer);
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.originX = offset.x;
    d.originY = offset.y;
    d.active = false;
    d.pressTimer = window.setTimeout(() => {
      d.active = true;
      setDragging(true);
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    const d = dragRef.current;
    if (d.pressTimer != null) {
      window.clearTimeout(d.pressTimer);
      d.pressTimer = null;
    }
  };

  const requestClose = () => {
    if (chat) {
      setConfirmEnd(true);
      return;
    }
    onClose();
  };

  const expandChat = () => {
    setMinimized(false);
    if (chat) persist(chat, false, offset);
  };

  const confirmEndConversation = () => {
    setConfirmEnd(false);
    setChat(null);
    setUnreadCount(0);
    setReply("");
    setMinimized(false);
    setOffset({ x: 0, y: 0 });
    lastAdminMsgIdRef.current = null;
    soundReadyRef.current = false;
    writeSession(null);
    onClose();
  };

  const endCopy = {
    title: cb.customEndTitle,
    body: cb.customEndBody,
    cancel: cb.customEndCancel,
    confirm: cb.customEndConfirm,
  };

  if (!mounted || restoring) return null;

  const visible = open || Boolean(chat);
  if (!visible) return null;

  const inputClass = (key: string) =>
    cn(
      "mt-1 w-full rounded-xl border bg-white p-3 font-normal text-slate-900 caret-slate-900 outline-none transition placeholder:text-slate-400",
      fieldErrors[key]
        ? "border-red-500 bg-red-50 ring-2 ring-red-200"
        : "border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-200",
    );

  const requiredMark = <span className="text-red-500"> *</span>;

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = dictionary.auth.required;
    if (!form.lastName.trim()) next.lastName = dictionary.auth.required;
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = dictionary.auth.invalidEmail;
    }
    if (form.phoneNational.replace(/\D/g, "").length < 6) next.phone = dictionary.auth.invalidPhone;
    if (!channel || !available.includes(channel)) next.channel = cb.customChooseChannel;
    if (Object.keys(next).length) {
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    const phone = formatInternationalPhone(form.phoneIso2, form.phoneNational);

    try {
      const res = await fetch("/api/custom-booking/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phoneCountryIso2: form.phoneIso2,
          phoneNational: form.phoneNational,
          channel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || cb.customCouldNotStart);
      const nextChat = data.chat as ChatView;
      applyChatUpdate(nextChat, { markAsSeenBaseline: true });
      setMinimized(false);
      persist(nextChat, false, offset);

      if (channel === "whatsapp" || channel === "viber" || channel === "telegram") {
        const intro = [
          "Hello! I'd like a custom car & driver booking.",
          `Tracking code: ${nextChat.code}`,
          `Name: ${form.firstName.trim()} ${form.lastName.trim()}`,
          `Email: ${form.email.trim()}`,
          `Phone: ${phone}`,
        ].join("\n");
        const href = buildCustomBookingChannelHref(
          channel,
          channels[channel].contact,
          intro,
          WHATSAPP_NUMBER,
        );
        window.open(href, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : cb.customCouldNotStart);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chat || !reply.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/custom-booking/chats/${encodeURIComponent(chat.code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: chat.email, body: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || cb.customCouldNotSend);
      applyChatUpdate(data.chat as ChatView, { markAsSeenBaseline: true });
      setReply("");
    } catch (err) {
      setError(err instanceof Error ? err.message : cb.customCouldNotSend);
    } finally {
      setLoading(false);
    }
  };

  const sendPhoto = async (file: File) => {
    if (!chat) return;
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("code", chat.code);
      fd.append("email", chat.email);
      const up = await fetch("/api/custom-booking/upload", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error || cb.customCouldNotSend);
      const res = await fetch(`/api/custom-booking/chats/${encodeURIComponent(chat.code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: chat.email, imageUrl: upData.url, body: cb.customPhoto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || cb.customCouldNotSend);
      applyChatUpdate(data.chat as ChatView, { markAsSeenBaseline: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : cb.customCouldNotSend);
    } finally {
      setLoading(false);
    }
  };

  const selectCar = async (imageUrl: string) => {
    if (!chat) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/custom-booking/chats/${encodeURIComponent(chat.code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: chat.email,
          selectCarImageUrl: imageUrl,
          selectCarNote: cb.customSelectedCar,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || cb.customCouldNotSend);
      applyChatUpdate(data.chat as ChatView, { markAsSeenBaseline: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : cb.customCouldNotSend);
    } finally {
      setLoading(false);
    }
  };

  const windowTitle = chat
    ? `${dictionary.home.customTitle} · ${chat.code}`
    : dictionary.home.customTitle;

  const confirmPortal = confirmEnd
    ? createPortal(
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/55 p-4">
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="end-chat-title"
          >
            <h3 id="end-chat-title" className="text-lg font-extrabold text-[#0b1f4b]">
              {endCopy.title}
            </h3>
            <p className="mt-2 text-sm text-slate-600">{endCopy.body}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
                onClick={confirmEndConversation}
              >
                {endCopy.confirm}
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                onClick={() => setConfirmEnd(false)}
              >
                {endCopy.cancel}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  if (minimized && chat) {
    return (
      <>
        {createPortal(
          <div className="fixed bottom-4 right-4 z-[220] flex max-w-[min(100vw-2rem,24rem)] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-2xl">
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left text-sm font-bold text-[#0b1f4b]"
              onClick={expandChat}
              title={cb.customRestore}
            >
              {windowTitle}
            </button>
            <button
              type="button"
              className="relative rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={expandChat}
              aria-label={cb.customRestore}
            >
              <MessageCircle className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={requestClose}
              aria-label={dictionary.home.close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>,
          document.body,
        )}
        {confirmPortal}
      </>
    );
  }

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center p-4 text-slate-900"
          role="dialog"
          aria-modal="true"
          aria-label={dictionary.home.customTitle}
        >
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]" aria-hidden />
          <div
            className={cn(
              "relative max-h-[92vh] w-full max-w-[calc(32rem+10cm)] overflow-y-auto rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl",
              dragging ? "cursor-grabbing select-none" : "",
            )}
            style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
          >
            <div
              className={cn(
                "sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5",
                dragging ? "cursor-grabbing" : "cursor-grab",
              )}
              onPointerDown={beginLongPressDrag}
              onPointerUp={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onPointerCancel={cancelLongPress}
              title={cb.customDragHint}
            >
              <div className="min-w-0 pr-2">
                <h2 className="truncate text-lg font-extrabold text-[#0b1f4b] sm:text-xl">
                  {dictionary.home.customTitle}
                </h2>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 sm:text-sm">
                  {dictionary.home.customBody}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                {chat ? (
                  <button
                    type="button"
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    onClick={minimizeChat}
                    aria-label={cb.customMinimize}
                    title={cb.customMinimize}
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  onClick={requestClose}
                  aria-label={dictionary.home.close}
                  title={dictionary.home.close}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 sm:px-8 sm:pb-7">
              {error ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}

              {chat ? (
                <div className="flex min-h-0 flex-col gap-2">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] leading-tight text-[#0b1f4b]">
                      <span className="min-w-0 truncate font-semibold" title={chat.email}>
                        <span className="font-bold uppercase text-emerald-700">{dictionary.auth.email} </span>
                        {chat.email}
                      </span>
                      <span className="font-semibold">
                        <span className="font-bold uppercase text-emerald-700">{dictionary.auth.phone} </span>
                        {chat.phone}
                      </span>
                      <span className="font-mono text-sm font-extrabold">
                        <span className="font-sans text-[10px] font-bold uppercase text-emerald-700">{cb.customCode} </span>
                        {chat.code}
                      </span>
                      <span className="font-bold uppercase text-emerald-800">
                        {chat.status}
                        {chat.channel ? ` · ${chat.channel}` : ""}
                      </span>
                    </div>
                    {chat.status === "ACTIVE" && chat.bookingNote ? (
                      <p className="mt-1 line-clamp-1 text-[11px] text-emerald-950">{chat.bookingNote}</p>
                    ) : null}
                    {chat.selectedCarImageUrl ? (
                      <div className="mt-1 flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={chat.selectedCarImageUrl}
                          alt=""
                          className="h-8 w-12 rounded object-cover"
                        />
                        <p className="truncate text-[11px] text-emerald-900">
                          {chat.selectedCarNote || cb.customSelectedCar}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <ChatMessageThread
                    messages={chat.messages}
                    className="max-h-[min(52vh,420px)] min-h-[220px] flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3"
                    renderMessage={(m) => (
                      <div
                        className={cn(
                          "max-w-[90%] rounded-xl px-3 py-2 text-sm",
                          m.sender === "GUEST"
                            ? "ms-auto bg-[#22c55e] text-white"
                            : "bg-white text-slate-800 shadow-sm",
                        )}
                      >
                        {m.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.imageUrl}
                            alt=""
                            className="mb-2 max-h-40 w-full rounded-lg object-cover"
                          />
                        ) : null}
                        {m.body}
                        {m.carOffer && m.imageUrl && chat.status !== "REJECTED" ? (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => void selectCar(m.imageUrl!)}
                            className="mt-2 w-full rounded-lg bg-[#0b1f4b] px-3 py-1.5 text-xs font-bold text-white"
                          >
                            {cb.customSelectThisCar}
                          </button>
                        ) : null}
                      </div>
                    )}
                  />
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold text-slate-700">
                      <ImagePlus className="h-3.5 w-3.5" />
                      {cb.customPhoto}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={loading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) void sendPhoto(f);
                        }}
                      />
                    </label>
                  </div>
                  <form onSubmit={sendReply} className="flex gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder={cb.customWriteMessage}
                    />
                    <button
                      type="submit"
                      disabled={loading || !reply.trim()}
                      className="rounded-xl bg-[#22c55e] px-4 py-2.5 text-sm font-bold text-white disabled:bg-slate-400"
                    >
                      {cb.customSend}
                    </button>
                  </form>
                </div>
              ) : (
                <form onSubmit={start} className="grid gap-3 sm:grid-cols-2" noValidate>
                  <label className="text-sm font-semibold text-slate-800">
                    {dictionary.auth.firstName}
                    {requiredMark}
                    <input
                      className={inputClass("firstName")}
                      value={form.firstName}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, firstName: e.target.value }));
                        setFieldErrors((prev) => {
                          const { firstName: _, ...rest } = prev;
                          return rest;
                        });
                      }}
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-800">
                    {dictionary.auth.lastName}
                    {requiredMark}
                    <input
                      className={inputClass("lastName")}
                      value={form.lastName}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, lastName: e.target.value }));
                        setFieldErrors((prev) => {
                          const { lastName: _, ...rest } = prev;
                          return rest;
                        });
                      }}
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-800 sm:col-span-2">
                    {dictionary.auth.email}
                    {requiredMark}
                    <input
                      type="email"
                      className={inputClass("email")}
                      value={form.email}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, email: e.target.value }));
                        setFieldErrors((prev) => {
                          const { email: _, ...rest } = prev;
                          return rest;
                        });
                      }}
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <PhoneCountryField
                      label={dictionary.auth.phone}
                      iso2={form.phoneIso2}
                      national={form.phoneNational}
                      required
                      invalid={Boolean(fieldErrors.phone)}
                      onIso2Change={(iso2) => setForm((p) => ({ ...p, phoneIso2: iso2 }))}
                      onNationalChange={(national) => {
                        setForm((p) => ({ ...p, phoneNational: national }));
                        setFieldErrors((prev) => {
                          const { phone: _, ...rest } = prev;
                          return rest;
                        });
                      }}
                    />
                  </div>

                  {available.length > 0 ? (
                    <fieldset
                      className={cn(
                        "sm:col-span-2",
                        fieldErrors.channel
                          ? "rounded-xl border border-red-500 bg-red-50/60 p-3"
                          : undefined,
                      )}
                    >
                      <legend className="text-sm font-semibold text-slate-800">
                        {cb.customHowShouldWeChat}
                        {requiredMark}
                      </legend>
                      <p className="mt-1 text-xs font-normal text-slate-500">
                        {available.length === 1
                          ? cb.customChannelHintAuto
                          : cb.customChannelHintChoose}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {available.map((key) => {
                          const meta = CHANNEL_META[key];
                          const Icon = meta.Icon;
                          const active = channel === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setChannel(key);
                                setFieldErrors((prev) => {
                                  const { channel: _, ...rest } = prev;
                                  return rest;
                                });
                              }}
                              className={cn(
                                "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition",
                                meta.className,
                                active
                                  ? "ring-2 ring-black ring-offset-2 ring-offset-white"
                                  : "opacity-55 hover:opacity-100",
                              )}
                              aria-pressed={active}
                            >
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border-2 border-black/20 bg-black/10">
                                <Icon />
                              </span>
                              {channelLabel(key)}
                            </button>
                          );
                        })}
                      </div>
                      {fieldErrors.channel ? (
                        <p className="mt-2 text-xs font-normal text-red-600">{fieldErrors.channel}</p>
                      ) : null}
                    </fieldset>
                  ) : (
                    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 sm:col-span-2">
                      {cb.customNoChannels}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || available.length === 0}
                    className="mt-1 rounded-lg bg-[#22c55e] py-3 text-sm font-extrabold uppercase tracking-wide text-white hover:bg-[#16a34a] disabled:bg-slate-400 sm:col-span-2"
                  >
                    {loading ? cb.customStarting : cb.customStart}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
      {confirmPortal}
    </>
  );
}
