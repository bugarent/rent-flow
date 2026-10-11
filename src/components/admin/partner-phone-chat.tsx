"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MessengerLogo } from "@/components/partner/phone-messenger-icons";
import { activePartnerMessengerLinks } from "@/lib/partners/messenger-chat-link";
import type { PartnerSocialPlatform } from "@/lib/partner";
import { cn } from "@/lib/utils";

const MENU_LABEL = {
  ka: "აირჩიეთ ქსელი",
  en: "Choose a network",
  ru: "Выберите сеть",
} as const;

export function PartnerPhoneChat({
  phone,
  messengers,
  locale = "ka",
  className,
  edit,
}: {
  phone: string;
  messengers: readonly string[];
  locale?: "ka" | "en" | "ru";
  className?: string;
  /** Keeps the number editable. Clicking the number still opens the active messengers. */
  edit?: { onChange: (value: string) => void; label: string };
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const display = phone.trim();
  const links = activePartnerMessengerLinks(display, messengers);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  if (!display || display === "—") {
    if (!edit) return <span className={className}>—</span>;
    return (
      <input
        className={cn("min-h-10 w-full min-w-0 flex-1 border-0 bg-transparent text-base font-semibold outline-none", className)}
        value={phone}
        aria-label={edit.label}
        onChange={(event) => edit.onChange(event.target.value)}
      />
    );
  }

  if (links.length === 0) {
    if (!edit) return <span className={cn("min-w-0 break-all font-semibold", className)}>{display}</span>;
    return (
      <input
        className={cn("min-h-10 w-full min-w-0 flex-1 border-0 bg-transparent text-base font-semibold outline-none", className)}
        value={phone}
        aria-label={edit.label}
        onChange={(event) => edit.onChange(event.target.value)}
      />
    );
  }

  if (edit && editing) {
    return (
      <input
        autoFocus
        className={cn("min-h-10 w-full min-w-0 flex-1 border-0 bg-transparent text-base font-semibold outline-none", className)}
        value={phone}
        aria-label={edit.label}
        onChange={(event) => edit.onChange(event.target.value)}
        onBlur={() => setEditing(false)}
      />
    );
  }

  const editButton = edit ? (
    <button
      type="button"
      onClick={() => {
        setOpen(false);
        setEditing(true);
      }}
      className="pointer-events-auto inline-flex min-h-10 shrink-0 items-center rounded-md border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700"
    >
      {edit.label}
    </button>
  ) : null;

  if (links.length === 1) {
    const only = links[0];
    return (
      <div className={cn("flex min-w-0 flex-1 flex-wrap items-center gap-2", className)}>
        <a
          href={only.href}
          target="_blank"
          rel="noopener noreferrer"
          title={only.label}
          className="pointer-events-auto inline-flex min-h-10 min-w-0 items-center break-all font-semibold text-[#0b1f4b] underline decoration-slate-300 underline-offset-2"
        >
          {display}
        </a>
        {editButton}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("pointer-events-auto relative flex min-w-0 flex-1 flex-wrap items-center gap-2", className)}>
      <span
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setOpen((value) => !value);
        }}
        className="pointer-events-auto inline-flex min-h-10 cursor-pointer items-center break-all font-semibold text-[#0b1f4b] underline decoration-slate-300 underline-offset-2"
      >
        {display}
      </span>
      {editButton}
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={MENU_LABEL[locale]}
          className="absolute start-0 z-30 mt-1 w-max min-w-[11rem] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
        >
          <p className="px-2 py-1 text-[11px] font-semibold text-slate-500">{MENU_LABEL[locale]}</p>
          {links.map((item) => (
            <a
              key={item.platform}
              role="menuitem"
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="pointer-events-auto flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-bold text-slate-900 hover:bg-slate-50"
            >
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-md",
                  item.platform === "WHATSAPP"
                    ? "bg-[#25D366] text-white"
                    : item.platform === "VIBER"
                      ? "bg-[#7360F2] text-white"
                      : "bg-[#2AABEE] text-white",
                )}
              >
                <MessengerLogo platform={item.platform as PartnerSocialPlatform} />
              </span>
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Icon links for the messengers this phone already has turned on. */
export function PartnerMessengerLinks({
  phone,
  messengers,
}: {
  phone: string;
  messengers: readonly string[];
}) {
  const links = activePartnerMessengerLinks(phone, messengers);
  if (!links.length) return null;
  return (
    <div className="flex shrink-0 items-center gap-1">
      {links.map((item) => (
        <a
          key={item.platform}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          title={item.label}
          aria-label={item.label}
          className={cn(
            "pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-md",
            item.platform === "WHATSAPP"
              ? "bg-[#25D366] text-white"
              : item.platform === "VIBER"
                ? "bg-[#7360F2] text-white"
                : "bg-[#2AABEE] text-white",
          )}
        >
          <MessengerLogo platform={item.platform as PartnerSocialPlatform} />
        </a>
      ))}
    </div>
  );
}
