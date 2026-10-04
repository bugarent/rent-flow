"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MessageCircle, X } from "lucide-react";
import { usePreferences } from "@/components/providers/preferences-context";
import { subscribeLiveChatWidget } from "@/components/live-chat/live-chat-widget-bus";
import { RouteLoadingSpinner } from "@/components/layout/route-loading-spinner";

const LiveChatPanel = dynamic(
  () => import("@/components/live-chat/live-chat-panel").then((m) => m.LiveChatPanel),
  { ssr: false, loading: () => <RouteLoadingSpinner /> },
);

export function FloatingOnlineChat({
  email: _email,
  phone: _phone,
}: {
  email?: string;
  phone?: string;
}) {
  const { dictionary } = usePreferences();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const label = dictionary.common.onlineChat;

  useEffect(() => {
    return subscribeLiveChatWidget(() => {
      setMounted(true);
      setOpen(true);
    });
  }, []);

  const toggle = () => {
    setMounted(true);
    setOpen((v) => !v);
  };

  return (
    <div className="pointer-events-none fixed bottom-[5.25rem] start-3 z-[60] flex flex-col items-start gap-3 md:bottom-6 md:start-auto md:end-4 md:items-end">
      {mounted && open ? (
        <div className="pointer-events-auto w-[min(100vw-2rem,24rem)] shadow-[0_24px_60px_rgba(11,31,75,0.28)]">
          <LiveChatPanel onClose={() => setOpen(false)} />
        </div>
      ) : null}

      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={toggle}
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1d6fe8] text-white shadow-xl transition hover:bg-[#1558c0] sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-3"
      >
        {open ? <X className="h-6 w-6" aria-hidden /> : <MessageCircle className="h-6 w-6" aria-hidden />}
        <span className="hidden max-w-[9rem] text-[11px] font-bold uppercase leading-tight sm:block">
          {label}
        </span>
      </button>
    </div>
  );
}
