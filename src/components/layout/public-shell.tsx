"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { FooterContactConfig } from "@/lib/catalog/footer-contact";
import { isAdminPath, isBusinessPartnerPath, isPartnerPath } from "@/lib/routes";
import { useResolvedFooterContact } from "@/components/layout/use-resolved-footer-contact";

const PublicChrome = dynamic(
  () => import("@/components/layout/public-chrome").then((mod) => mod.PublicChrome),
  { loading: () => <div className="min-h-full flex-1" /> },
);

export function PublicShell({
  children,
  footerContact,
}: {
  children: React.ReactNode;
  footerContact?: FooterContactConfig | null;
}) {
  const pathname = usePathname() || "/";
  const contact = useResolvedFooterContact(footerContact);
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
    <PublicChrome contact={contact} isHome={isHome}>
      {children}
    </PublicChrome>
  );
}
