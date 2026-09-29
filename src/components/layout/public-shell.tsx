"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FloatingOnlineChat } from "@/components/layout/floating-online-chat";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import type { FooterContactConfig } from "@/lib/catalog/footer-contact";
import { isAdminPath, isBusinessPartnerPath, isPartnerPath } from "@/lib/routes";

export function PublicShell({
  children,
  footerContact,
}: {
  children: React.ReactNode;
  footerContact?: FooterContactConfig | null;
}) {
  const pathname = usePathname() || "/";
  if (
    isAdminPath(pathname) ||
    isPartnerPath(pathname) ||
    isBusinessPartnerPath(pathname) ||
    pathname === "/invoice" ||
    pathname.startsWith("/invoice/")
  ) {
    return <div className="flex min-h-full flex-1 flex-col overflow-x-clip">{children}</div>;
  }

  const isHome = pathname === "/";

  return (
    <>
      <Suspense fallback={<div className="h-[68px] sm:h-[76px] lg:h-[84px]" aria-hidden />}>
        <Header overlay={isHome} />
      </Suspense>
      <main className="relative min-w-0 flex-1 overflow-x-clip pb-20 md:pb-0">{children}</main>
      <Footer contact={footerContact} />
      <FloatingOnlineChat email={footerContact?.email} phone={footerContact?.phone} />
      <MobileBottomNav />
    </>
  );
}
