"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Bank of Georgia card form, rendered in place (card number, pay, Google Pay).
 * The order id comes from our server; card data stays inside BOG’s frame.
 */
export function CheckoutBogFrame({
  orderId,
  locale,
  onPaid,
  onFailed,
}: {
  orderId: string;
  locale: string;
  onPaid: () => void;
  onFailed: (message: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const paidRef = useRef(onPaid);
  const failedRef = useRef(onFailed);
  paidRef.current = onPaid;
  failedRef.current = onFailed;
  const [height, setHeight] = useState(480);

  useEffect(() => {
    const node = host.current;
    if (!node || !orderId) return;
    let cancelled = false;
    let session: { disconnect: () => void; resize: (w?: string, h?: string) => void } | null = null;

    (async () => {
      const { BogPaymentSession } = await import("@bankofgeorgia/bog-payments-web-sdk");
      if (cancelled || !host.current) return;
      const next = new BogPaymentSession(orderId, {
        width: "100%",
        height: "480",
        lang: locale === "ka" ? "ka" : "en",
        theme: "light",
      });
      next.on("form_layout_changed", (data) => {
        const nextHeight = Math.max(420, Math.min(920, Number(data?.preferredMinHeight) || 480));
        setHeight(nextHeight);
        try {
          next.resize("100%", String(nextHeight));
        } catch {
          /* frame already removed */
        }
      });
      next.on("payment_complete", (data) => {
        if (data?.error) {
          failedRef.current(
            locale === "ka"
              ? "გადახდა ვერ დასრულდა. სცადეთ თავიდან ან აირჩიეთ PayPal."
              : locale === "ru"
                ? "Оплата не прошла. Попробуйте снова или выберите PayPal."
                : "Payment did not go through. Try again or choose PayPal.",
          );
          return;
        }
        paidRef.current();
      });
      next.render(host.current);
      session = next;
    })().catch(() => {
      if (!cancelled) {
        failedRef.current(
          locale === "ka"
            ? "საქართველოს ბანკის ფორმა ვერ გაიხსნა. განაახლეთ გვერდი."
            : "The Bank of Georgia form could not be opened. Refresh the page.",
        );
      }
    });

    return () => {
      cancelled = true;
      try {
        session?.disconnect();
      } catch {
        node.replaceChildren();
      }
    };
  }, [locale, orderId]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div
        ref={host}
        className="w-full [&_iframe]:w-full [&_iframe]:max-w-full [&_iframe]:border-0"
        style={{ minHeight: height }}
      />
    </div>
  );
}
