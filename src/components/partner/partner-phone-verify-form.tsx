"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PARTNER_LOGIN } from "@/lib/routes";

export function PartnerPhoneVerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const preview = searchParams.get("preview");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/partners/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      router.push(`${PARTNER_LOGIN}?registered=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-600">Enter the 4-digit code sent to your phone to submit the application for admin review.</p>
      {preview ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Development code: {preview}</p> : null}
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
      <label className="block text-sm font-semibold">
        4-digit code
        <input
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          className="mt-1 w-full rounded-xl border p-3 tracking-[0.4em] text-center text-lg"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          required
        />
      </label>
      <button disabled={loading || !userId} className="w-full rounded-xl bg-sky-600 py-3 font-bold text-white disabled:bg-slate-400">
        {loading ? "Verifying..." : "Verify and submit application"}
      </button>
    </form>
  );
}
