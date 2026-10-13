"use client";

import { Suspense } from "react";
import { AdminLocaleProvider } from "@/components/providers/admin-locale-context";
import { PartnersManager } from "@/components/admin/partners-manager";

const partners = [
  ["p1", "Levan Sarishvili", "+995555111222", "levan@example.com"],
  ["p2", "RentGeoCar", "+995599333444", "geo@example.com"],
  ["p3", "Ocean Drive", "+38267123456", "ocean@example.com"],
  ["p4", "Jeep Rent Kutaisi", "", "jeep@example.com"],
].map(([id, name, phone, email], i) => ({
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
  country: "Georgia",
}));

if (typeof window !== "undefined" && !(window as { __bcMock?: boolean }).__bcMock) {
  (window as { __bcMock?: boolean }).__bcMock = true;
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/api/admin/partners/broadcast")) {
      const body = JSON.parse(String(init?.body || "{}"));
      const picked = partners.filter((p) => body.partnerIds.includes(p.id));
      const payload =
        body.action === "contacts"
          ? {
              smsConfigured: false,
              contacts: picked.map((p, i) => ({
                id: p.id,
                name: p.displayName,
                phone: p.phone,
                email: p.email,
                messengers: i % 2 ? ["VIBER"] : ["WHATSAPP"],
                hasTelegram: i !== 1,
              })),
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
  return (
    <AdminLocaleProvider initialLocale="ka">
      <div className="mx-auto max-w-5xl p-4">
        <Suspense>
          <PartnersManager initialPartners={partners} mode="directory" />
        </Suspense>
      </div>
    </AdminLocaleProvider>
  );
}
