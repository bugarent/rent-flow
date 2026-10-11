"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { uiText } from "@/lib/i18n/ui-text";
import { PARTNER_BASE } from "@/lib/routes";

const EXTRAS_HREF = `${PARTNER_BASE}/equipment-service#partner-insurance-services`;

type GateValue = {
  gate: boolean;
  extrasHref: string;
};

const GateContext = createContext<GateValue>({ gate: false, extrasHref: EXTRAS_HREF });

export function usePartnerExtrasGate() {
  return useContext(GateContext);
}

export function isPartnerExtrasPath(pathname: string) {
  return pathname === `${PARTNER_BASE}/equipment-service` || pathname.startsWith(`${PARTNER_BASE}/equipment-service/`);
}

export function PartnerExtrasGateProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onExtras = isPartnerExtrasPath(pathname);
  const [gate, setGate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (onExtras) {
          await fetch("/api/partners/cabinet-onboarding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "ack" }),
          });
        }
        const res = await fetch("/api/partners/cabinet-onboarding", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok) setGate(Boolean(data?.gate));
      } catch {
        if (!cancelled) setGate(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onExtras, pathname]);

  return <GateContext.Provider value={{ gate, extrasHref: EXTRAS_HREF }}>{children}</GateContext.Provider>;
}

export function PartnerExtrasGateNotice() {
  const pathname = usePathname();
  const { gate, extrasHref } = usePartnerExtrasGate();
  const { locale } = usePartnerLocale();
  if (!gate || isPartnerExtrasPath(pathname)) return null;

  const title = uiText(
    locale,
    "Set up additional services first",
    "ჯერ დააყენეთ დამატებითი მომსახურეობა",
    "Сначала настройте доп. услуги",
  );
  const body = uiText(
    locale,
    "The Additional services button is highlighted. You cannot open other sections until you enter that window and set up additional services.",
    "დამატებითი მომსახურეობის ღილაკი გაყვითლებულია. ამ ფანჯარაში შესვლის გარეშე სხვა ფანჯრებში ვერ შეხვალთ — პირველ რიგში დააყენეთ დამატებითი მომსახურეობები.",
    "Кнопка доп. услуг подсвечена. Без входа в это окно другие разделы не откроются — сначала настройте дополнительные услуги.",
  );
  const action = uiText(
    locale,
    "Open additional services",
    "დამატებითი მომსახურეობის გახსნა",
    "Открыть доп. услуги",
  );

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 text-amber-950 shadow-sm">
        <h1 className="text-lg font-extrabold leading-snug">{title}</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed">{body}</p>
        <Link
          href={extrasHref}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-amber-400 px-4 py-2.5 text-center text-sm font-extrabold text-amber-950 hover:bg-amber-300 sm:w-auto"
        >
          {action}
        </Link>
      </div>
    </div>
  );
}
