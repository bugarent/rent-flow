"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Bank of Georgia card form on this page (card number / pay).
 * Always offers the hosted BOG page as soon as we have a redirect URL so the
 * payment step never sits as an empty white box if the iframe is slow/blocked.
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
  const [showFallback, setShowFallback] = useState(Boolean(redirectUrl));
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const node = host.current;
    const id = String(orderId || "").trim();
    if (!node || !id) {
      setStatus("error");
      setShowFallback(Boolean(redirectUrl));
      return;
    }

    let cancelled = false;
    let session: { disconnect: () => void; resize: (w?: string, h?: string) => void } | null =
      null;
    setStatus("loading");
    // Keep the bank-page CTA visible while loading so the slot is never blank.
    setShowFallback(Boolean(redirectUrl));

    const markMissing = () => {
      if (cancelled) return;
      const hasFrame = Boolean(node.querySelector("iframe"));
      if (hasFrame) return;
      setShowFallback(true);
      setStatus("error");
      failedRef.current(
        locale === "ka"
          ? "ბარათის ფორმა ვერ ჩაიტვირთა. გახსენით საქართველოს ბანკის გვერდი ქვემოთ ან სცადეთ თავიდან."
          : "The card form did not load. Open the Bank of Georgia page below or try again.",
      );
    };

    const watchdog = window.setTimeout(markMissing, 2500);

    (async () => {
      try {
        const mod = await import("@bankofgeorgia/bog-payments-web-sdk");
        const BogPaymentSession =
          mod.BogPaymentSession ||
          (mod as { default?: { BogPaymentSession?: unknown } }).default?.BogPaymentSession ||
          (typeof window !== "undefined"
            ? (window as { BogPaymentSession?: unknown }).BogPaymentSession
            : undefined);
        if (cancelled || !host.current) return;
        if (typeof BogPaymentSession !== "function") {
          throw new Error("BOG_SDK_MISSING");
        }

        host.current.replaceChildren();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK constructor typing
        const next = new (BogPaymentSession as any)(id, {
          width: "100%",
          height: "520",
          lang: locale === "ka" ? "ka" : "en",
          theme: "light",
          submitButton: { display: true },
        });
        next.on("form_layout_changed", (data: { preferredMinHeight?: number }) => {
          const nextHeight = Math.max(420, Math.min(920, Number(data?.preferredMinHeight) || 520));
          setHeight(nextHeight);
          setStatus("ready");
          try {
            next.resize("100%", String(nextHeight));
          } catch {
            /* frame already removed */
          }
        });
        next.on("payment_complete", (data: { error?: { message?: string } }) => {
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

        window.setTimeout(() => {
          if (cancelled) return;
          if (host.current?.querySelector("iframe")) {
            setStatus("ready");
          } else {
            markMissing();
          }
        }, 1200);
      } catch {
        if (!cancelled) {
          setStatus("error");
          setShowFallback(true);
          failedRef.current(
            locale === "ka"
              ? "საქართველოს ბანკის ფორმა ვერ გაიხსნა. გახსენით ბანკის გვერდი ქვემოთ."
              : "The Bank of Georgia form could not be opened. Use the bank page link below.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      try {
        session?.disconnect();
      } catch {
        node.replaceChildren();
      }
    };
  }, [locale, orderId, redirectUrl]);

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
        data-bog-host="1"
        className="w-full bg-white [&_iframe]:block [&_iframe]:w-full [&_iframe]:max-w-full [&_iframe]:border-0"
        style={{ minHeight: status === "error" && showFallback ? 0 : height }}
      />
      {showFallback && redirectUrl ? (
        <div className="space-y-2 border-t border-slate-100 px-4 py-4">
          <a
            href={redirectUrl}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#ff6200] px-4 text-sm font-extrabold text-white hover:bg-[#e55800]"
          >
            {locale === "ka"
              ? status === "ready"
                ? "გადახდა საქართველოს ბანკის გვერდზე"
                : "ბარათის მონაცემების შეყვანა — საქართველოს ბანკი"
              : status === "ready"
                ? "Pay on Bank of Georgia page"
                : "Enter card details on Bank of Georgia"}
          </a>
          <p className="text-center text-xs text-slate-500">
            {locale === "ka"
              ? "ბარათის ნომერი და CVV ივსება ბანკის უსაფრთხო გვერდზე."
              : "Card number and CVV are entered on the bank’s secure page."}
          </p>
        </div>
      ) : null}
      {status === "error" && !redirectUrl ? (
        <p className="px-4 py-4 text-center text-sm font-medium text-red-600">
          {locale === "ka"
            ? "ბარათის ფორმა ვერ ჩაიტვირთა. სცადეთ თავიდან."
            : "The card form could not load. Please try again."}
        </p>
      ) : null}
    </div>
  );
}
