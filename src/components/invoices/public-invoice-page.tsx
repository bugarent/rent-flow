"use client";

import { useEffect, useState } from "react";
import { BookingInvoiceDocumentView } from "@/components/invoices/booking-invoice-document";
import type { BookingInvoiceDocument } from "@/lib/invoices/types";

export function PublicInvoicePage({
  token,
  locale = "en",
}: {
  token: string;
  locale?: string;
}) {
  const [doc, setDoc] = useState<BookingInvoiceDocument | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/invoices/${encodeURIComponent(token)}?locale=${encodeURIComponent(locale)}`,
          { cache: "no-store" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.document) {
          throw new Error(typeof data.error === "string" ? data.error : "Not found");
        }
        if (!cancelled) setDoc(data.document as BookingInvoiceDocument);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, locale]);

  return (
    <main className="min-h-screen bg-[#e8ecf2] px-3 py-6 sm:px-6">
      <div className="mx-auto mb-4 flex max-w-[820px] justify-end gap-2 print:hidden">
        <button
          type="button"
          disabled={!doc}
          onClick={() => window.print()}
          className="rounded-lg bg-[#0b1f4b] px-4 py-2 text-sm font-bold text-white hover:bg-[#14306a] disabled:opacity-50"
        >
          Print / PDF
        </button>
      </div>
      {loading ? (
        <p className="text-center text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="mx-auto max-w-md rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-800">
          {error}
        </p>
      ) : doc ? (
        <BookingInvoiceDocumentView
          doc={doc}
          locale={locale}
          className="rounded-xl p-5 shadow-md sm:p-8"
        />
      ) : null}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body { background: white !important; }
          .invoice-print-sheet {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `,
        }}
      />
    </main>
  );
}
