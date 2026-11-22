"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const BOG_ORIGIN = "https://payment.bog.ge";
const BOG_IFRAME_PATH = "/iframe-v2";

function bogIframeSrc(orderId: string, locale: string) {
  const options = {
    width: "100%",
    height: "560",
    lang: locale === "ka" ? "ka" : "en",
    theme: "light",
    submitButton: { display: true },
  };
  const q = new URLSearchParams({
    order_id: orderId,
    theme: "light",
    lang: options.lang,
    options: JSON.stringify(options),
  });
  return `${BOG_ORIGIN}${BOG_IFRAME_PATH}?${q.toString()}`;
}

/**
 * Bank of Georgia card form (card number / pay) embedded under the Card method.
 * Uses the official iframe-v2 URL directly so the form paints without waiting on the SDK chunk.
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
  const paidRef = useRef(onPaid);
  const failedRef = useRef(onFailed);
  paidRef.current = onPaid;
  failedRef.current = onFailed;

  const id = String(orderId || "").trim();
  const src = useMemo(() => (id ? bogIframeSrc(id, locale) : ""), [id, locale]);
  const [height, setHeight] = useState(560);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [frameFailed, setFrameFailed] = useState(false);

  useEffect(() => {
    if (!id || !src) {
      setStatus("error");
      setFrameFailed(true);
      return;
    }
    setStatus("loading");
    setFrameFailed(false);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== BOG_ORIGIN) return;
      const data = event.data as
        | {
            type?: string;
            payload?: {
              preferredMinHeight?: number;
              error?: { message?: string };
            };
          }
        | null;
      if (!data || typeof data !== "object") return;

      if (data.type === "form_layout_changed") {
        const nextHeight = Math.max(
          420,
          Math.min(920, Number(data.payload?.preferredMinHeight) || 560),
        );
        setHeight(nextHeight);
        setStatus("ready");
        setFrameFailed(false);
        return;
      }
      if (data.type === "payment_complete") {
        if (data.payload?.error) {
          failedRef.current(
            locale === "ka"
              ? "გადახდა ვერ დასრულდა. სცადეთ თავიდან ან აირჩიეთ PayPal."
              : "Payment did not go through. Try again or choose PayPal.",
          );
          return;
        }
        paidRef.current();
      }
    };

    window.addEventListener("message", onMessage);
    const readyTimer = window.setTimeout(() => {
      setStatus((prev) => (prev === "loading" ? "ready" : prev));
    }, 1600);
    const failTimer = window.setTimeout(() => {
      setStatus((prev) => {
        if (prev === "ready") return prev;
        setFrameFailed(true);
        failedRef.current(
          locale === "ka"
            ? "ბარათის ფორმა ვერ ჩაიტვირთა. სცადეთ თავიდან."
            : "The card form did not load. Please try again.",
        );
        return "error";
      });
    }, 12000);

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(readyTimer);
      window.clearTimeout(failTimer);
    };
  }, [id, locale, src]);

  if (!id) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
        {locale === "ka" ? "გადახდის შეკვეთა ვერ მოიძებნა." : "Payment order is missing."}
      </p>
    );
  }

  // Last resort only — primary path is the in-page card form under Card.
  if (frameFailed && redirectUrl) {
    return (
      <div className="space-y-2 rounded-2xl border border-[#ff6200]/40 bg-[#fff5ef] px-4 py-4">
        <p className="text-center text-sm font-semibold text-[#0b1f4b]">
          {locale === "ka"
            ? "ბარათის ფორმა ამ გვერდზე ვერ ჩაიტვირთა"
            : "The card form could not open on this page"}
        </p>
        <a
          href={redirectUrl}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#ff6200] px-4 text-sm font-extrabold text-white hover:bg-[#e55800]"
        >
          {locale === "ka"
            ? "გადახდა საქართველოს ბანკის გვერდზე"
            : "Pay on Bank of Georgia page"}
        </a>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#ff6200]/35 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <p className="text-sm font-extrabold text-[#0b1f4b]">
          {locale === "ka" ? "ბარათის მონაცემები" : "Card details"}
        </p>
        <p className="text-[11px] text-slate-500">
          {status === "loading"
            ? locale === "ka"
              ? "ფორმა იტვირთება…"
              : "Loading form…"
            : locale === "ka"
              ? "შეიყვანეთ ბარათის ნომერი და დააჭირეთ გადახდას"
              : "Enter your card number and pay"}
        </p>
      </div>
      <iframe
        title={locale === "ka" ? "საქართველოს ბანკის ბარათის ფორმა" : "Bank of Georgia card form"}
        src={src}
        width="100%"
        height={height}
        className="block w-full max-w-full border-0 bg-white"
        style={{ minHeight: height }}
        sandbox="allow-forms allow-scripts allow-popups allow-same-origin"
        referrerPolicy="origin"
        onLoad={() => {
          setStatus("ready");
          setFrameFailed(false);
        }}
      />
    </div>
  );
}
