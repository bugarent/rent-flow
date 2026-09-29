"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { CalendarDays, FileText, MessageCircle, X } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/brand";
import { usePreferences } from "@/components/providers/preferences-context";

const ManageBookingModal = dynamic(
  () =>
    import("@/components/layout/manage-booking-modal").then((m) => m.ManageBookingModal),
  { ssr: false },
);

const ContactOptionsModal = dynamic(
  () =>
    import("@/components/contact/contact-options-modal").then((m) => m.ContactOptionsModal),
  { ssr: false },
);

export function HelpCenterModal({
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
  const hc = dictionary.helpCenter;
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingMounted, setBookingMounted] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMounted, setContactMounted] = useState(false);

  useEffect(() => {
    if (bookingOpen) setBookingMounted(true);
  }, [bookingOpen]);

  useEffect(() => {
    if (contactOpen) setContactMounted(true);
  }, [contactOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !bookingOpen && !contactOpen) onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, bookingOpen, contactOpen]);

  if (!open && !bookingOpen && !contactOpen) return null;

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-center-title"
          onClick={onClose}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(11,31,75,0.22)] ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={onClose}
              aria-label={dictionary.common.closeMenu}
            >
              <X className="h-5 w-5" />
            </button>
            <h2
              id="help-center-title"
              className="pr-8 text-xl font-extrabold tracking-tight text-[#0b1f4b]"
            >
              {hc.title}
            </h2>

            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1d6fe8] px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1558c0]"
                onClick={() => {
                  onClose();
                  setContactMounted(true);
                  setContactOpen(true);
                }}
              >
                <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
                {dictionary.common.onlineChat}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#2563eb] bg-white px-4 py-3.5 text-sm font-bold text-[#2563eb] transition hover:bg-sky-50"
                onClick={() => {
                  onClose();
                  setBookingMounted(true);
                  setBookingOpen(true);
                }}
              >
                <CalendarDays className="h-5 w-5 shrink-0" aria-hidden />
                {hc.manageBooking}
              </button>
              <Link
                href="/help"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#2563eb] bg-white px-4 py-3.5 text-sm font-bold text-[#2563eb] transition hover:bg-sky-50"
                onClick={onClose}
              >
                <FileText className="h-5 w-5 shrink-0" aria-hidden />
                {hc.browseArticles}
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {bookingMounted ? (
        <ManageBookingModal open={bookingOpen} onClose={() => setBookingOpen(false)} />
      ) : null}
      {contactMounted ? (
        <ContactOptionsModal
          open={contactOpen}
          onClose={() => setContactOpen(false)}
          email={email?.trim() || SUPPORT_EMAIL}
          phone={phone}
        />
      ) : null}
    </>
  );
}
