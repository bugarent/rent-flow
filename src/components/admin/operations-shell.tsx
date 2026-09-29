"use client";

import { usePathname } from "next/navigation";
import { AdminOperationsNav } from "@/components/admin/operations-nav";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { ADMIN_LOGIN } from "@/lib/routes";

export function AdminOperationsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { locale } = useAdminLocale();
  if (pathname === ADMIN_LOGIN) {
    return <>{children}</>;
  }
  return (
    <div
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-slate-100"
    >
      <AdminOperationsNav />
      <div className="min-w-0 flex-1 overflow-x-clip">{children}</div>
    </div>
  );
}
