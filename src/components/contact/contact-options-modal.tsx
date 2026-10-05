"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { usePreferences } from "@/components/providers/preferences-context";
import { ContactOptionsPanel } from "@/components/contact/contact-options-panel";
import { ContactMessageForm } from "@/components/contact/contact-message-form";
import { openLiveChatWidget } from "@/components/live-chat/live-chat-widget-bus";

export function ContactOptionsModal({
  open,
  onClose,
  email,
  phone,
}: {
  open: boolean;
  onClose: () => void;
  email?: string;
  phone?: string;
}) {
  const { dictionary } = usePreferences();
  const [view, setView] = useState<"options" | "compose">("options");

  useEffect(() => {
    if (open) setView("options");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view !== "options") setView("options");
        else onClose();
      }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, view]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-options-title"
      onClick={onClose}
    >
      {view === "compose" ? (
        <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
          <ContactMessageForm onClose={() => setView("options")} />
        </div>
      ) : (
        <div
          className="relative w-full max-w-2xl rounded-2xl bg-[#eef3f8] p-5 shadow-[0_24px_60px_rgba(11,31,75,0.22)] ring-1 ring-slate-200 sm:p-7"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="absolute end-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-white"
            onClick={onClose}
            aria-label={dictionary.common.closeMenu}
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <h2
            id="contact-options-title"
            className="pr-8 text-xl font-extrabold tracking-tight text-[#0b1f4b]"
          >
            {dictionary.common.contact}
          </h2>
          <ContactOptionsPanel
            email={email}
            phone={phone}
            onOpenCompose={() => setView("compose")}
            onOpenLiveChat={() => {
              onClose();
              openLiveChatWidget();
            }}
            onAction={onClose}
            className="mt-5"
          />
        </div>
      )}
    </div>
  );
}
