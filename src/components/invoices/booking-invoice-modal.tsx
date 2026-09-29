"use client";

import { Component, useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BookingInvoiceDocumentView } from "@/components/invoices/booking-invoice-document";
import type { BookingInvoiceDocument } from "@/lib/invoices/types";

function labels(locale: string) {
  if (locale === "ka") {
    return {
      title: "ინვოისი",
      close: "დახურვა",
      print: "ბეჭდვა / PDF",
      share: "კლიენტის ლინკი",
      sendLink: "გასაგზავნი ლინკი",
      copyLink: "კოპირება",
      copied: "ლინკი დაკოპირებულია",
      loading: "იტვირთება…",
      failed: "ინვოისი ვერ ჩაიტვირთა",
      shareFailed: "ლინკი ვერ შეიქმნა",
      renderFailed: "ინვოისის ჩვენება ვერ მოხერხდა — თავიდან სცადეთ",
    };
  }
  if (locale === "ru") {
    return {
      title: "Инвойс",
      close: "Закрыть",
      print: "Печать / PDF",
      share: "Ссылка клиенту",
      sendLink: "Ссылка для отправки",
      copyLink: "Копировать",
      copied: "Ссылка скопирована",
      loading: "Загрузка…",
      failed: "Не удалось загрузить инвойс",
      shareFailed: "Не удалось создать ссылку",
      renderFailed: "Не удалось отобразить инвойс — попробуйте снова",
    };
  }
  return {
    title: "Invoice",
    close: "Close",
    print: "Print / PDF",
    share: "Client link",
    sendLink: "Link to send",
    copyLink: "Copy",
    copied: "Link copied",
    loading: "Loading…",
    failed: "Could not load invoice",
    shareFailed: "Could not create share link",
    renderFailed: "Could not render invoice — try again",
  };
}

class InvoiceErrorBoundary extends Component<
  { resetKey: string; fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export function BookingInvoiceModal({
  bookingId,
  locale = "en",
  onClose,
  loadUrl,
  allowShare = true,
}: {
  bookingId: string;
  locale?: string;
  onClose: () => void;
  /** When set, the invoice is loaded from this URL instead of the admin endpoint. */
  loadUrl?: string;
  allowShare?: boolean;
}) {
  const t = labels(locale);
  const [mounted, setMounted] = useState(false);
  const [doc, setDoc] = useState<BookingInvoiceDocument | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [shareBusy, setShareBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!bookingId) {
      setError(t.failed);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ bookingId, locale });
      const res = await fetch(loadUrl || `/api/admin/invoice?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.document) {
        throw new Error(typeof data.error === "string" ? data.error : t.failed);
      }
      setDoc(data.document as BookingInvoiceDocument);
      if (typeof data.shareUrl === "string" && data.shareUrl) {
        setShareUrl(data.shareUrl);
      }
    } catch (err) {
      setDoc(null);
      setError(err instanceof Error ? err.message : t.failed);
    } finally {
      setLoading(false);
    }
  }, [bookingId, loadUrl, locale, t.failed]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const createShare = async () => {
    setShareBusy(true);
    try {
      const res = await fetch("/api/admin/invoice/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.shareUrl !== "string") {
        throw new Error(typeof data.error === "string" ? data.error : t.shareFailed);
      }
      setShareUrl(data.shareUrl);
      try {
        await navigator.clipboard.writeText(data.shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.shareFailed);
    } finally {
      setShareBusy(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-2 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-[#eef1f6] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="invoice-modal-toolbar flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
          <h2 className="shrink-0 text-base font-extrabold text-[#0b1f4b]">{t.title}</h2>
          {shareUrl ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 text-[11px] font-bold text-[#0b1f4b]">{t.sendLink}</span>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-xs font-semibold text-sky-700 underline"
                title={shareUrl}
              >
                {shareUrl}
              </a>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(shareUrl).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2500);
                  }).catch(() => undefined);
                }}
                className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-[#0b1f4b] hover:bg-slate-50"
              >
                {copied ? t.copied : t.copyLink}
              </button>
            </div>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {allowShare ? (
              <button
                type="button"
                disabled={shareBusy || loading || !doc}
                onClick={() => void createShare()}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-[#0b1f4b] hover:bg-slate-50 disabled:opacity-50"
              >
                {copied ? t.copied : t.share}
              </button>
            ) : null}
            <button
              type="button"
              disabled={!doc}
              onClick={() => window.print()}
              className="rounded-lg bg-[#0b1f4b] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#14306a] disabled:opacity-50"
            >
              {t.print}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              {t.close}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
          {error ? (
            <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}
          {loading ? (
            <p className="text-sm text-slate-500">{t.loading}</p>
          ) : doc ? (
            <InvoiceErrorBoundary
              resetKey={doc.invoiceNumber + doc.issuedAt}
              fallback={
                <div className="space-y-3">
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {t.renderFailed}
                  </p>
                  <BookingInvoiceDocumentView
                    doc={{ ...doc, creditNotes: [] }}
                    locale={locale}
                    className="rounded-xl bg-white p-5 shadow-sm sm:p-8"
                  />
                </div>
              }
            >
              <BookingInvoiceDocumentView
                doc={doc}
                locale={locale}
                className="rounded-xl bg-white p-5 shadow-sm sm:p-8"
              />
            </InvoiceErrorBoundary>
          ) : null}
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden !important; }
          .invoice-print-sheet, .invoice-print-sheet * { visibility: visible !important; }
          .invoice-print-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 12mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
          }
          .invoice-modal-toolbar { display: none !important; }
        }
      `,
        }}
      />
    </div>,
    document.body,
  );
}
