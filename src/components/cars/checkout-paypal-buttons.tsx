"use client";

import { useEffect, useRef } from "react";

type PaypalButtons = {
  render: (target: HTMLElement) => Promise<void>;
  close: () => Promise<void>;
};

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID?: string }) => void;
        onError: () => void;
        onCancel: () => void;
      }) => PaypalButtons;
    };
  }
}

const scripts = new Map<string, Promise<void>>();

function loadPaypalSdk(clientId: string): Promise<void> {
  const existing = scripts.get(clientId);
  if (existing) return existing;
  const task = new Promise<void>((resolve, reject) => {
    if (window.paypal) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=EUR&intent=capture&components=buttons`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scripts.delete(clientId);
      reject(new Error("PayPal script failed"));
    };
    document.head.appendChild(script);
  });
  scripts.set(clientId, task);
  return task;
}

/** PayPal’s own buttons, on this page, for an order our server already created. */
export function CheckoutPaypalButtons({
  clientId,
  orderId,
  locale,
  onPaid,
  onFailed,
}: {
  clientId: string;
  orderId: string;
  locale: string;
  onPaid: (paypalOrderId: string) => void;
  onFailed: (message: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const paidRef = useRef(onPaid);
  const failedRef = useRef(onFailed);
  paidRef.current = onPaid;
  failedRef.current = onFailed;

  useEffect(() => {
    const node = host.current;
    if (!node || !clientId || !orderId) return;
    let cancelled = false;
    let buttons: PaypalButtons | null = null;

    loadPaypalSdk(clientId)
      .then(async () => {
        if (cancelled || !host.current || !window.paypal) return;
        host.current.replaceChildren();
        buttons = window.paypal.Buttons({
          createOrder: async () => orderId,
          onApprove: (data) => {
            const id = String(data.orderID || orderId).trim();
            if (!id) {
              failedRef.current(
                locale === "ka" ? "PayPal-მა შეკვეთა არ დააბრუნა." : "PayPal did not return an order.",
              );
              return;
            }
            paidRef.current(id);
          },
          onError: () => {
            failedRef.current(
              locale === "ka"
                ? "PayPal გადახდა ვერ დასრულდა. სცადეთ თავიდან."
                : "PayPal payment did not finish. Please try again.",
            );
          },
          onCancel: () => {
            /* The buyer closed PayPal. The buttons stay so they can try again. */
          },
        });
        await buttons.render(host.current);
      })
      .catch(() => {
        if (!cancelled) {
          failedRef.current(
            locale === "ka"
              ? "PayPal-ის ფორმა ვერ გაიხსნა. განაახლეთ გვერდი."
              : "PayPal could not be opened. Refresh the page.",
          );
        }
      });

    return () => {
      cancelled = true;
      void buttons?.close().catch(() => undefined);
      node.replaceChildren();
    };
  }, [clientId, locale, orderId]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div ref={host} className="min-h-[120px] w-full" />
    </div>
  );
}
