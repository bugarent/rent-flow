"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePreferences } from "@/components/providers/preferences-context";
import { safePortalCallback } from "@/lib/routes";

type Portal = "admin" | "partner";

const PORTAL_AUTH_BASE = {
  admin: "/api/auth/admin",
  partner: "/api/auth/partner",
} as const;

async function signInOnPortal(
  portal: Portal,
  email: string,
  password: string,
  callbackUrl: string,
) {
  const basePath = PORTAL_AUTH_BASE[portal];
  const csrfRes = await fetch(`${basePath}/csrf`, { credentials: "same-origin" });
  if (!csrfRes.ok) return { error: "CredentialsSignin" };
  const csrf = (await csrfRes.json()) as { csrfToken?: string };
  const res = await fetch(`${basePath}/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    credentials: "same-origin",
    body: new URLSearchParams({
      csrfToken: csrf.csrfToken ?? "",
      email,
      password,
      callbackUrl,
      json: "true",
    }),
  });
  const data = (await res.json().catch(() => null)) as { url?: string } | null;
  let error: string | null = null;
  if (data?.url) {
    try {
      error = new URL(data.url, window.location.origin).searchParams.get("error");
    } catch {
      error = "CredentialsSignin";
    }
  }
  if (!res.ok || error) return { error: error || "CredentialsSignin" };
  return { error: null };
}

export function LoginForm({
  portal,
  title,
  embedded = false,
}: {
  portal: Portal;
  title?: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dictionary } = usePreferences();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const callbackUrl = safePortalCallback(searchParams.get("callbackUrl"), portal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signInOnPortal(portal, email, password, callbackUrl);
    if (res?.error) {
      setLoading(false);
      if (portal === "partner") {
        try {
          const hintRes = await fetch("/api/partners/login-hint", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const hint = await hintRes.json();
          if (hint.reason === "phone_verify") {
            setError("Complete phone verification before signing in.");
            return;
          }
          if (hint.reason === "pending_approval") {
            setError("Your application is awaiting administrator approval.");
            return;
          }
          if (hint.reason === "rejected") {
            setError("This partner application was rejected.");
            return;
          }
        } catch {
          /* fall through */
        }
      }
      setError(dictionary.auth.invalidCredentials);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
    setLoading(false);
  };

  const body = (
    <>
      {!embedded ? <h1 className="mb-6 text-2xl font-bold text-slate-900">{title || "Log in"}</h1> : null}
      {error ? <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded-xl border p-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded-xl border p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-sky-600 py-3 font-bold text-white">
          Log in
        </button>
      </form>
    </>
  );

  if (embedded) return body;

  return <div className="mx-auto w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">{body}</div>;
}
