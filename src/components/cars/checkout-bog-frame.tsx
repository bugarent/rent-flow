"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Bank of Georgia card form on this page (card number / pay / Google Pay).
 * Falls back to the hosted BOG page if the iframe does not appear in time.
 */
export function CheckoutBogFrame({
  orderId,
  locale,
  redirectUrl,
  onPaid,
  onFailed,
}: {
  orderId: string;
  locale: string;
  redirectUrl?: string;
  onPaid: () => void;
  onFailed: (message: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const paidRef = useRef(onPaid);
  const failedRef = useRef(onFailed);
  paidRef.current = onPaid;
  failedRef.current = onFailed;
  const [height, setHeight] = useState(520);
  const [showFallback, setShowFallback] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const node = host.current;
    if (!node || !orderId) return;
    let cancelled = false;
    let session: { disconnect: () => void; resize: (w?: string, h?: string) => void } | null =
      null;
    setStatus("loading");
    setShowFallback(false);

    const watchdog = window.setTimeout(() => {
      if (cancelled) return;
      const hasFrame = Boolean(node.querySelector("iframe"));
      if (!hasFrame) {
        setShowFallback(true);
        setStatus("error");
        failedRef.current(
          locale === "ka"
            ? "ბარათის ფორმა ვერ ჩაიტვირთა. გახსენით საქართველოს ბანკის გვერდი ქვემოთ ან სცადეთ თავიდან."
            : "The card form did not load. Open the Bank of Georgia page below or try again.",
        );
      }
    }, 10000);

    (async () => {
      const { BogPaymentSession } = await import("@bankofgeorgia/bog-payments-web-sdk");
      if (cancelled || !host.current) return;
      host.current.replaceChildren();
      const next = new BogPaymentSession(orderId, {
        width: "100%",
        height: "520",
        lang: locale === "ka" ? "ka" : "en",
        theme: "light",
      });
      next.on("form_layout_changed", (data) => {
        const nextHeight = Math.max(420, Math.min(920, Number(data?.preferredMinHeight) || 520));
        setHeight(nextHeight);
        setStatus("ready");
        setShowFallback(false);
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
      // SDK may not fire layout event on some browsers — treat iframe presence as ready.
      window.setTimeout(() => {
        if (cancelled) return;
        if (host.current?.querySelector("iframe")) {
          setStatus("ready");
          setShowFallback(false);
        }
      }, 1500);
    })().catch(() => {
      if (!cancelled) {
        setStatus("error");
        setShowFallback(true);
        failedRef.current(
          locale === "ka"
            ? "საქართველოს ბანკის ფორმა ვერ გაიხსნა. გახსენით ბანკის გვერდი ქვემოთ."
            : "The Bank of Georgia form could not be opened. Use the bank page link below.",
        );
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      try {
        session?.disconnect();
      } catch {
        node.replaceChildren();
      }
    };
  }, [locale, orderId]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {status === "loading" ? (
        <p className="border-b border-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-500">
          {locale === "ka"
            ? "ბარათის ფორმა იტვირთება…"
            : locale === "ru"
              ? "Загрузка формы карты…"
              : "Loading card form…"}
        </p>
      ) : null}
      <div
        ref={host}
        className="w-full [&_iframe]:w-full [&_iframe]:max-w-full [&_iframe]:border-0"
        style={{ minHeight: height }}
      />
      {showFallback && redirectUrl ? (
        <div className="space-y-2 border-t border-slate-100 px-4 py-4">
          <a
            href={redirectUrl}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#ff6200] px-4 text-sm font-extrabold text-white hover:bg-[#e55800]"
          >
            {locale === "ka"
              ? "გახსენით საქართველოს ბანკის გადახდის გვერდი"
              : "Open Bank of Georgia payment page"}
          </a>
          <p className="text-center text-xs text-slate-500">
            {locale === "ka"
              ? "ბარათის მონაცემები ივსება ბანკის უსაფრთხო გვერდზე."
              : "Card details are entered on the bank’s secure page."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
