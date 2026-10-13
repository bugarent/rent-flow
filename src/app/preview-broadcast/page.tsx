"use client";

import { Suspense, useEffect } from "react";
import { AdminLocaleProvider } from "@/components/providers/admin-locale-context";
import { PartnersManager } from "@/components/admin/partners-manager";

const partners = [
  ["p1", "Levan Sarishvili", "+995555111222", "+995555000111", "levan@example.com"],
  ["p2", "RentGeoCar", "+995599333444", "", "geo@example.com"],
  ["p3", "Ocean Drive", "+38267123456", "+38267000001", "ocean@example.com"],
  ["p4", "Jeep Rent Kutaisi", "", "", "jeep@example.com"],
].map(([id, name, phone, secondaryPhone, email], i) => ({
  id,
  displayName: name,
  kind: "COMPANY" as const,
  status: "APPROVED",
  sequentialNumber: 1030 + i,
  personalId: `ID${i}`,
  fleetSize: 3,
  carCount: i,
  email,
  phone,
  secondaryPhone,
  country: i === 2 ? "Georgia, Montenegro" : "Georgia",
}));

function installBroadcastMock() {
  if ((window as { __bcMock?: boolean }).__bcMock) return;
  (window as { __bcMock?: boolean }).__bcMock = true;
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/api/admin/partners/broadcast")) {
      const body = JSON.parse(String(init?.body || "{}"));
      const targets = Array.isArray(body.targets)
        ? body.targets
        : (body.partnerIds || []).map((id: string) => ({ id, slots: ["primary", "secondary"] }));
      const picked = partners.filter((p) => targets.some((target: { id: string }) => target.id === p.id));
      const phonesFor = (partner: (typeof partners)[number], slots: string[]) =>
        [slots.includes("primary") ? partner.phone : "", slots.includes("secondary") ? partner.secondaryPhone : ""].filter(Boolean);
      const payload =
        body.action === "contacts"
          ? {
              smsConfigured: true,
              contacts: picked.map((p, i) => {
                const slots = targets.find((target: { id: string }) => target.id === p.id)?.slots || [];
                const phones = phonesFor(p, slots);
                return {
                  id: p.id,
                  name: p.displayName,
                  phone: phones[0] || "",
                  phones,
                  email: p.email,
                  messengers: i % 2 ? ["VIBER"] : ["WHATSAPP"],
                  hasTelegram: i !== 1,
                };
              }),
            }
          : {
              ok: true,
              results: picked.map((p, i) => ({ id: p.id, name: p.displayName, telegram: i !== 1 ? true : undefined, email: i !== 2 })),
            };
      (window as { __lastBroadcast?: unknown }).__lastBroadcast = body;
      return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return real(input, init);
  };
}

export default function Page() {
  useEffect(() => {
    installBroadcastMock();
  }, []);
  return (
    <AdminLocaleProvider initialLocale="ka">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Suspense>
          <PartnersManager initialPartners={partners} mode="directory" />
        </Suspense>
      </div>
    </AdminLocaleProvider>
  );
}
