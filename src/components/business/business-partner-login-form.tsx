"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BUSINESS_PARTNER_BASE } from "@/lib/routes";

export function BusinessPartnerLoginForm({
  title,
  emailLabel,
  passwordLabel,
  submitLabel,
  backLabel,
  errorInvalid,
  errorPending,
  errorRejected,
}: {
  title: string;
  emailLabel: string;
  passwordLabel: string;
  submitLabel: string;
  backLabel: string;
  errorInvalid: string;
  errorPending: string;
  errorRejected: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/business-partners/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) {
        if (data.code === "PENDING") setError(errorPending);
        else if (data.code === "REJECTED") setError(errorRejected);
        else setError(data.error || errorInvalid);
        return;
      }
      router.push(BUSINESS_PARTNER_BASE);
      router.refresh();
    } catch {
      setError(errorInvalid);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-extrabold text-[#0b1f4b]">{title}</h1>
      {error ? (
        <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-600">{error}</p>
      ) : null}
      <form onSubmit={(e) => void onSubmit(e)} className="mt-5 space-y-3">
        <label className="block text-sm font-semibold text-slate-700">
          {emailLabel}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          {passwordLabel}
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#f97316] px-4 py-3 text-sm font-bold text-white hover:bg-[#ea580c] disabled:opacity-50"
        >
          {loading ? "…" : submitLabel}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/partnership" className="font-semibold text-[#1d6fe8] hover:underline">
          {backLabel}
        </Link>
      </p>
    </div>
  );
}
