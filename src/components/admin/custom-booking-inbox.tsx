"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BellOff, BellRing, ImagePlus, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CHAT_SOUND_PRESETS,
  getAdminChatSoundId,
  getAdminMutedChatIds,
  isAdminChatMuted,
  playChatSound,
  setAdminChatMuted,
  setAdminChatSoundId,
  type ChatSoundId,
} from "@/lib/chat-notification-sound";
import type { CustomBookingChatStatus } from "@/lib/catalog/custom-booking-chat";
import { ChatMessageThread } from "@/components/chat/chat-message-thread";
import { earliestPickupLocalInput } from "@/lib/bookings/lead-time";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string | null {
  if (!local.trim()) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

type ChatListItem = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: CustomBookingChatStatus;
  channel: string;
  selectedCarImageUrl: string | null;
  bookingNote: string;
  activatedAt: string | null;
  completedAt: string | null;
  lastMessageAt: string;
  unreadCount: number;
  preview: string;
};

type ChatDetail = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: CustomBookingChatStatus;
  channel: string;
  carPhotos: string[];
  selectedCarImageUrl: string | null;
  selectedCarNote: string;
  bookingNote: string;
  pickupAt?: string | null;
  dropoffAt?: string | null;
  partnerListingId?: string | null;
  partnerListingLabel?: string;
  bookingRef?: string | null;
  priceEur?: number | null;
  commissionPercent?: number | null;
  messages: Array<{
    id: string;
    sender: "GUEST" | "ADMIN";
    body: string;
    createdAt: string;
    imageUrl?: string;
    carOffer?: boolean;
  }>;
};

export function CustomBookingInbox() {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChatDetail | null>(null);
  const [reply, setReply] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [pickupLocal, setPickupLocal] = useState("");
  const [dropoffLocal, setDropoffLocal] = useState("");
  const [listingId, setListingId] = useState("");
  const [priceEur, setPriceEur] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("0");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [soundId, setSoundId] = useState<ChatSoundId>("chime");
  const [mutedIds, setMutedIds] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const carFileRef = useRef<HTMLInputElement>(null);
  const knownGuestMsgRef = useRef<Map<string, string>>(new Map());
  const soundReadyRef = useRef(false);

  useEffect(() => {
    setSoundId(getAdminChatSoundId());
    setMutedIds(getAdminMutedChatIds());
  }, []);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/admin/custom-booking/chats", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load");
    const nextChats = (data.chats || []) as ChatListItem[];

    if (soundReadyRef.current) {
      for (const chat of nextChats) {
        if (chat.unreadCount <= 0) continue;
        if (isAdminChatMuted(chat.id) || mutedIds.includes(chat.id)) continue;
        const prevKey = knownGuestMsgRef.current.get(chat.id);
        const key = `${chat.lastMessageAt}:${chat.unreadCount}:${chat.preview}`;
        if (prevKey && prevKey !== key) {
          playChatSound(getAdminChatSoundId());
          break;
        }
      }
    }
    for (const chat of nextChats) {
      knownGuestMsgRef.current.set(
        chat.id,
        `${chat.lastMessageAt}:${chat.unreadCount}:${chat.preview}`,
      );
    }
    soundReadyRef.current = true;
    setChats(nextChats);
  }, [mutedIds]);

  const openChat = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setBusy(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/custom-booking/chats/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to open");
        const chat = data.chat as ChatDetail;
        setDetail(chat);
        setBookingNote(chat.bookingNote || "");
        setPickupLocal(chat.pickupAt ? toLocalInput(chat.pickupAt) : "");
        setDropoffLocal(chat.dropoffAt ? toLocalInput(chat.dropoffAt) : "");
        setListingId(chat.partnerListingId || "");
        setPriceEur(chat.priceEur != null ? String(chat.priceEur) : "");
        setCommissionPercent(chat.commissionPercent != null ? String(chat.commissionPercent) : "0");
        await loadList();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      } finally {
        setBusy(false);
      }
    },
    [loadList],
  );

  useEffect(() => {
    void loadList().catch((err) => setError(err instanceof Error ? err.message : "Failed"));
    const timer = window.setInterval(() => {
      void loadList().catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) return;
    let lastGuestId: string | null =
      detail?.messages.filter((m) => m.sender === "GUEST").at(-1)?.id ?? null;
    const timer = window.setInterval(() => {
      void fetch(`/api/admin/custom-booking/chats/${selectedId}`, { cache: "no-store" })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) return;
          const next = data.chat as ChatDetail;
          const latestGuest = next.messages.filter((m) => m.sender === "GUEST").at(-1);
          if (
            latestGuest &&
            lastGuestId &&
            latestGuest.id !== lastGuestId &&
            !isAdminChatMuted(selectedId)
          ) {
            playChatSound(getAdminChatSoundId());
          }
          if (latestGuest) lastGuestId = latestGuest.id;
          setDetail(next);
          await loadList();
        })
        .catch(() => undefined);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [selectedId, loadList]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/custom-booking/chats/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setDetail(data.chat as ChatDetail);
      setReply("");
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const uploadAndSend = async (file: File, asCarOffer: boolean) => {
    if (!selectedId) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/custom-booking/upload", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error || "Upload failed");
      const res = await fetch(`/api/admin/custom-booking/chats/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: asCarOffer ? "Car option for you — tap Select if you like this one." : "Photo",
          imageUrl: upData.url,
          carOffer: asCarOffer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setDetail(data.chat as ChatDetail);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const patchStatus = async (status: CustomBookingChatStatus) => {
    if (!selectedId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/custom-booking/chats/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          bookingNote,
          pickupAt: fromLocalInput(pickupLocal),
          dropoffAt: fromLocalInput(dropoffLocal),
          partnerListingId: listingId.trim() || null,
          partnerListingLabel: listingId.trim(),
          priceEur: priceEur.trim() ? Number(priceEur) : null,
          commissionPercent: commissionPercent.trim() ? Number(commissionPercent) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDetail(data.chat as ChatDetail);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/custom-booking/chats/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingNote,
          pickupAt: fromLocalInput(pickupLocal),
          dropoffAt: fromLocalInput(dropoffLocal),
          partnerListingId: listingId.trim() || null,
          partnerListingLabel: listingId.trim(),
          priceEur: priceEur.trim() ? Number(priceEur) : null,
          commissionPercent: commissionPercent.trim() ? Number(commissionPercent) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDetail(data.chat as ChatDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const removeChat = async () => {
    if (!selectedId) return;
    if (!window.confirm("Delete this chat/booking permanently?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/custom-booking/chats/${selectedId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSelectedId(null);
      setDetail(null);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  // Keep OPEN/CLOSED in the inbox; also surface any thread with unread guest mail
  // (e.g. ACTIVE) so the nav badge matches visible rows.
  const filtered = [...chats]
    .filter((c) => c.status === "OPEN" || c.status === "CLOSED" || Number(c.unreadCount) > 0)
    .sort((a, b) => {
      const au = Number(a.unreadCount) > 0 ? 1 : 0;
      const bu = Number(b.unreadCount) > 0 ? 1 : 0;
      if (au !== bu) return bu - au;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

  const onPickSound = (id: ChatSoundId) => {
    setSoundId(id);
    setAdminChatSoundId(id);
    playChatSound(id);
  };

  const toggleMute = (chatId: string) => {
    const nextMuted = !isAdminChatMuted(chatId);
    setAdminChatMuted(chatId, nextMuted);
    setMutedIds((prev) =>
      nextMuted ? [...new Set([...prev, chatId])] : prev.filter((id) => id !== chatId),
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Volume2 className="h-4 w-4 text-slate-500" />
          <p className="text-sm font-extrabold text-[#0b1f4b]">Message notification sound</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CHAT_SOUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPickSound(preset.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                soundId === preset.id
                  ? "border-[#0b1f4b] bg-[#0b1f4b] text-white"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-2xl border bg-white shadow-sm">
          <ul className="max-h-[70vh] divide-y overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="p-6 text-center text-sm text-slate-500">No items in this list.</li>
            ) : (
              filtered.map((chat) => {
                const unread = Number(chat.unreadCount) > 0;
                const muted = mutedIds.includes(chat.id);
                const selected = selectedId === chat.id;
                return (
                  <li key={chat.id}>
                    <div
                      className={cn(
                        "flex items-stretch gap-1 border-l-4",
                        unread
                          ? "border-l-orange-500 bg-orange-100"
                          : "border-l-transparent bg-white",
                        selected && !unread && "bg-sky-50",
                        selected && unread && "bg-orange-200",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => void openChat(chat.id)}
                        className={cn(
                          "flex min-w-0 flex-1 flex-col gap-1 px-4 py-3 text-left transition",
                          unread ? "hover:bg-orange-200/70" : "hover:bg-slate-50/80",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "font-mono text-xs font-bold",
                              unread ? "text-orange-950" : "text-[#0b1f4b]",
                            )}
                          >
                            {chat.code}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {unread ? (
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-extrabold text-white">
                                {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                              </span>
                            ) : null}
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                unread
                                  ? "bg-orange-500/20 text-orange-900"
                                  : "bg-slate-100 text-slate-600",
                              )}
                            >
                              {chat.status}
                            </span>
                          </div>
                        </div>
                        <p
                          className={cn(
                            "text-sm",
                            unread ? "font-extrabold text-orange-950" : "font-semibold text-slate-800",
                          )}
                        >
                          {chat.firstName} {chat.lastName}
                        </p>
                        <p
                          className={cn(
                            "truncate text-xs",
                            unread ? "font-semibold text-orange-900/80" : "text-slate-500",
                          )}
                        >
                          {chat.channel} · {chat.preview}
                        </p>
                      </button>
                      <button
                        type="button"
                        title={muted ? "Unmute" : "Mute"}
                        onClick={() => toggleMute(chat.id)}
                        className={cn(
                          "me-2 mt-3 self-start rounded-lg p-2 hover:bg-white/60",
                          unread ? "text-orange-700" : "text-slate-400 hover:bg-slate-100",
                        )}
                      >
                        {muted ? <BellOff className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="flex min-h-[480px] flex-col rounded-2xl border bg-white shadow-sm">
          {error ? <p className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
          {!detail ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
              Select a chat or booking.
            </div>
          ) : (
            <>
              <div className="space-y-3 border-b px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-[#0b1f4b]">{detail.code}</p>
                    <p className="text-lg font-extrabold text-slate-900">
                      {detail.firstName} {detail.lastName}
                    </p>
                    <p className="text-sm text-slate-600">
                      {detail.email} · {detail.phone} · {detail.channel}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase text-slate-500">Status: {detail.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || detail.status === "ACTIVE"}
                      onClick={() => void patchStatus("ACTIVE")}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Activate booking
                    </button>
                    <button
                      type="button"
                      disabled={busy || detail.status === "REJECTED"}
                      onClick={() => void patchStatus("REJECTED")}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={busy || detail.status !== "ACTIVE"}
                      onClick={() => void patchStatus("COMPLETED")}
                      className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Complete
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeChat()}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <label className="block text-xs font-semibold text-slate-600">
                  Booking note (admin)
                  <div className="mt-1 flex gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
                      value={bookingNote}
                      onChange={(e) => setBookingNote(e.target.value)}
                      placeholder="Car model, notes…"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveNote()}
                      className="rounded-lg border px-3 py-2 text-xs font-bold"
                    >
                      Save
                    </button>
                  </div>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-600">
                    Pick-up date & time
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={pickupLocal}
                      min={
                        !pickupLocal || pickupLocal >= earliestPickupLocalInput()
                          ? earliestPickupLocalInput()
                          : undefined
                      }
                      onChange={(e) => {
                        const min = earliestPickupLocalInput();
                        setPickupLocal(e.target.value && e.target.value < min ? min : e.target.value);
                      }}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-600">
                    Drop-off date & time
                    <input
                      type="datetime-local"
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={dropoffLocal}
                      min={pickupLocal || earliestPickupLocalInput()}
                      onChange={(e) => {
                        const min = pickupLocal || earliestPickupLocalInput();
                        setDropoffLocal(e.target.value && e.target.value < min ? min : e.target.value);
                      }}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-600">
                    Partner listing number / car ID
                    <input
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      value={listingId}
                      onChange={(e) => setListingId(e.target.value)}
                      placeholder="Car id or listing code"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs font-semibold text-slate-600">
                      Price €
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        value={priceEur}
                        onChange={(e) => setPriceEur(e.target.value)}
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-600">
                      Commission %
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="1"
                        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                        value={commissionPercent}
                        onChange={(e) => setCommissionPercent(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
                {detail.bookingRef ? (
                  <p className="text-xs font-semibold text-emerald-800">
                    Booking refs: {detail.bookingRef} · {detail.code}
                    {detail.partnerListingId ? (
                      <>
                        {" "}
                        · Listing{" "}
                        <a
                          className="underline"
                          href={`/cars/${detail.partnerListingId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          open
                        </a>
                      </>
                    ) : null}
                  </p>
                ) : null}

                {detail.selectedCarImageUrl ? (
                  <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={detail.selectedCarImageUrl}
                      alt="Selected car"
                      className="h-16 w-24 rounded object-cover"
                    />
                    <div>
                      <p className="text-xs font-bold text-emerald-800">Guest selected car</p>
                      <p className="text-xs text-emerald-900">{detail.selectedCarNote || "—"}</p>
                    </div>
                  </div>
                ) : null}
              </div>

              <ChatMessageThread
                messages={detail.messages}
                className="min-h-0 flex-1 bg-slate-50 p-4"
                renderMessage={(m) => (
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                      m.sender === "ADMIN"
                        ? "ms-auto bg-[#0b1f4b] text-white"
                        : "bg-white text-slate-800 shadow-sm ring-1 ring-amber-100",
                    )}
                  >
                    {m.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.imageUrl}
                        alt=""
                        className="mb-2 max-h-48 w-full rounded-lg object-cover"
                      />
                    ) : null}
                    {m.body}
                    {m.carOffer ? (
                      <p className="mt-1 text-[10px] font-bold uppercase opacity-80">Car offer</p>
                    ) : null}
                  </div>
                )}
              />

              <div className="space-y-2 border-t p-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold"
                  >
                    <ImagePlus className="h-3.5 w-3.5" /> Send photo
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => carFileRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900"
                  >
                    <ImagePlus className="h-3.5 w-3.5" /> Offer car photo
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void uploadAndSend(f, false);
                    }}
                  />
                  <input
                    ref={carFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void uploadAndSend(f, true);
                    }}
                  />
                </div>
                <form onSubmit={send} className="flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-sm"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Reply to guest…"
                    disabled={busy}
                  />
                  <button
                    type="submit"
                    disabled={busy || !reply.trim()}
                    className="rounded-xl bg-[#0b1f4b] px-4 py-2.5 text-sm font-bold text-white disabled:bg-slate-400"
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
