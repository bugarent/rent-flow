"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import {
  AdminCurrencySelect,
  AdminLanguageSelect,
} from "@/components/admin/admin-language-select";
import { useAdminLocale } from "@/components/providers/admin-locale-context";

export function AdminLoginScreen() {
  const { dictionary } = useAdminLocale();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-end gap-2">
          <AdminCurrencySelect />
          <AdminLanguageSelect />
        </div>
        <Suspense>
          <LoginForm portal="admin" title={dictionary.login.title} />
        </Suspense>
      </div>
    </div>
  );
}
