"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { hasFooterContact, type FooterContactConfig } from "@/lib/catalog/footer-contact";

const STORAGE_KEY = "rac-footer-contact";

function readable(value: Partial<FooterContactConfig> | null | undefined): FooterContactConfig | null {
  if (!value) return null;
  const next: FooterContactConfig = {
    phone: String(value.phone || "").trim(),
    email: String(value.email || "").trim(),
    inboxEmail: "",
    address: String(value.address || "").trim(),
    updatedAt: String(value.updatedAt || ""),
  };
  return hasFooterContact(next) ? next : null;
}

function remember(contact: FooterContactConfig) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ phone: contact.phone, email: contact.email, address: contact.address }),
    );
  } catch {
    /* private mode */
  }
}

function remembered(): FooterContactConfig | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return readable(JSON.parse(raw) as Partial<FooterContactConfig>);
  } catch {
    return null;
  }
}

async function loadFooterContact(attempt = 0): Promise<FooterContactConfig | null> {
  try {
    const res = await fetch("/api/footer-contact", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const next = readable((await res.json()) as Partial<FooterContactConfig>);
    if (next) return next;
  } catch {
    /* try once more; a cold database read is what blanked the first paint */
  }
  if (attempt >= 1) return null;
  await new Promise((resolve) => setTimeout(resolve, 700));
  return loadFooterContact(attempt + 1);
}

/**
 * The shell stops waiting if Postgres is slow and renders an empty contact,
 * which hides the phone, email, and address. Show the last visit immediately,
 * then replace it with the saved contact once it loads.
 */
export function useResolvedFooterContact(initial?: FooterContactConfig | null) {
  const server = readable(initial);
  const [contact, setContact] = useState<FooterContactConfig | null>(server);

  useLayoutEffect(() => {
    if (server) return;
    const cached = remembered();
    if (cached) setContact(cached);
  }, [server]);

  useEffect(() => {
    if (server) {
      setContact(server);
      remember(server);
      return;
    }

    let cancelled = false;
    void loadFooterContact().then((next) => {
      if (cancelled || !next) return;
      setContact(next);
      remember(next);
    });
    return () => {
      cancelled = true;
    };
  }, [server?.phone, server?.email, server?.address]);

  return contact;
}
