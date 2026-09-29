"use client";

import { RegisterForm } from "@/components/auth/register-form";
import { usePreferences } from "@/components/providers/preferences-context";

export function AuthCard() {
  const { dictionary } = usePreferences();

  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border bg-white p-6 shadow-sm">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{dictionary.auth.registerTitle}</h1>
      <RegisterForm embedded />
    </div>
  );
}
