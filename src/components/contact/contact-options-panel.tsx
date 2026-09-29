"use client";

import { Mail, MessagesSquare } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/brand";
import { usePreferences } from "@/components/providers/preferences-context";

export function ContactOptionsPanel({
  email,
  phone,
  onOpenCompose,
  onOpenLiveChat,
  onAction,
  className = "",
}: {
  email?: string;
  phone?: string;
  onOpenCompose?: () => void;
  onOpenLiveChat?: () => void;
  onAction?: () => void;
  className?: string;
}) {
  const { dictionary } = usePreferences();
  const t = dictionary.contactModal;
  const mail = email?.trim() || SUPPORT_EMAIL;
  const tel = phone?.trim() || "";
  const mailHref = mail ? `mailto:${mail}` : undefined;
  const telHref = tel ? `tel:${tel.replace(/[^\d+]/g, "")}` : undefined;

  const btnClass =
    "mt-5 inline-flex w-full items-center justify-center rounded-md bg-[#e67e22] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#d35400]";

  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <article className="flex flex-col items-center rounded-xl bg-white px-5 py-6 text-center shadow-[0_8px_28px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e67e22] text-white shadow-sm">
            <Mail className="h-6 w-6" strokeWidth={2} aria-hidden />
          </span>
          <h3 className="mt-4 text-base font-extrabold text-slate-800">{t.getInTouchTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{t.getInTouchBody}</p>
          <button type="button" className={btnClass} onClick={() => onOpenCompose?.()}>
            {t.sendMessage}
          </button>
        </article>

        <article className="flex flex-col items-center rounded-xl bg-white px-5 py-6 text-center shadow-[0_8px_28px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1d6fe8] text-white shadow-sm">
            <MessagesSquare className="h-6 w-6" strokeWidth={2} aria-hidden />
          </span>
          <h3 className="mt-4 text-base font-extrabold text-slate-800">{t.liveChatTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{t.liveChatBody}</p>
          <button type="button" className={btnClass} onClick={() => onOpenLiveChat?.()}>
            {t.chatNow}
          </button>
        </article>
      </div>

      <p className="mt-6 text-center text-sm text-slate-600">
        {t.needMoreHelp}{" "}
        {telHref ? (
          <a href={telHref} className="font-bold text-[#1d6fe8] hover:underline" onClick={onAction}>
            {t.callUs}
          </a>
        ) : mailHref ? (
          <a href={mailHref} className="font-bold text-[#1d6fe8] hover:underline" onClick={onAction}>
            {t.callUs}
          </a>
        ) : (
          <span className="font-bold text-slate-400">{t.callUs}</span>
        )}
      </p>
    </div>
  );
}
