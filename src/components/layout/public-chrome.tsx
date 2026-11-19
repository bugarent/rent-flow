"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FloatingOnlineChat } from "@/components/layout/floating-online-chat";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import type { FooterContactConfig } from "@/lib/catalog/footer-contact";

/** Public header, footer, and chat. Loaded only on the public site, not in the portals. */
export function PublicChrome({
  children,
  contact,
  isHome,
}: {
  children: React.ReactNode;
  contact: FooterContactConfig | null;
  isHome: boolean;
}) {
  return (
    <>
      <Suspense
        fallback={
          isHome ? null : <div className="h-[7.25rem] sm:h-[76px] lg:h-[84px]" aria-hidden />
        }
      >
        <Header overlay={isHome} />
      </Suspense>
      <main className="relative min-w-0 flex-1 overflow-x-clip pb-20 md:pb-0">{children}</main>
      <Footer contact={contact} />
      <FloatingOnlineChat email={contact?.email} phone={contact?.phone} />
      <MobileBottomNav />
    </>
  );
}
