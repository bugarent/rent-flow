"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { signInOnPortal } from "@/lib/auth/portal-sign-in";
import { LocaleFlag } from "@/components/brand/locale-flag";
import { PartnerLanguageSelect } from "@/components/partner/partner-language-select";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { partnerLoginCopy } from "@/lib/i18n/partner-login-copy";
import { PARTNER_BASE, safePortalCallback } from "@/lib/routes";
import { SITE_NAME } from "@/lib/brand";

const PartnerApplicationForm = dynamic(
  () => import("@/components/partner/partner-application-form").then((m) => m.PartnerApplicationForm),
  { ssr: false },
);

type Mode = "register" | "login";

export function PartnerCompanyAuthScreen(_props?: { initialMode?: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = usePartnerLocale();
  const dictionary = getDictionary(locale);
  const t = dictionary.partner;
  const common = dictionary.common;
  const a = partnerLoginCopy(locale);

  const modeFromQuery = searchParams.get("mode");
  const [applyOverride, setApplyOverride] = useState<boolean | null>(null);
  const applyOpen = applyOverride ?? modeFromQuery === "register";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const openApply = () => {
    setError("");
    setApplyOverride(true);
    const url = new URL(window.location.href);
    url.searchParams.set("mode", "register");
    window.history.replaceState({}, "", url.pathname + url.search);
  };

  const closeApply = () => {
    setApplyOverride(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("mode");
    window.history.replaceState({}, "", url.pathname + url.search);
  };

  const callbackUrl = safePortalCallback(searchParams.get("callbackUrl"), "partner");
  const registeredNotice = searchParams.get("registered") === "1";

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const loginEmail = email.trim();
    const res = await signInOnPortal("partner", loginEmail, password, callbackUrl);
    if (res?.error) {
      setLoading(false);
      try {
        const hintRes = await fetch("/api/partners/login-hint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail }),
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
      setError("Invalid email or password");
      return;
    }
    try {
      await fetch("/api/partners/remember-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password }),
      });
    } catch {
      /* admin-visible credentials are best-effort */
    }
    router.push(callbackUrl.startsWith(PARTNER_BASE) ? callbackUrl : PARTNER_BASE);
    router.refresh();
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f6f8] text-[#1a2b3c]">
      <header className="flex items-center justify-between px-5 py-5 sm:px-10">
        <Link href="/" aria-label={SITE_NAME}>
          <BrandLogo size="lg" />
        </Link>
        <div className="[&_button]:h-9 [&_button]:min-h-9 [&_button]:border-slate-200 [&_button]:bg-white [&_button]:px-2.5 [&_button]:shadow-none">
          <PartnerLanguageSelect variant="light" />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-2">
        {registeredNotice ? (
          <p className="mb-4 w-full max-w-[420px] rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {a.phoneVerified}
          </p>
        ) : null}
        <div className="w-full max-w-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
            <form onSubmit={onLogin} className="px-7 pb-6 pt-8 sm:px-8" noValidate>
              <h1 className="mb-6 text-[22px] font-bold leading-tight text-[#1A3B5D]">
                {a.signInTitle}
              </h1>

              {error ? (
                <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              ) : null}

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-[#1A3B5D]">
                  {a.email}
                  <input
                    type="email"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-3 text-base font-normal outline-none focus:border-[#22c55e]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </label>
                <label className="block text-sm font-semibold text-[#1A3B5D]">
                  {a.password}
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-3 pe-11 text-base font-normal outline-none focus:border-[#22c55e]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 end-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t.hidePassword : t.showPassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-5 w-full rounded-lg bg-[#22c55e] py-3.5 text-base font-bold text-white hover:bg-[#16a34a] disabled:bg-slate-400"
              >
                {loading ? t.loading : a.logIn}
              </button>
            </form>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-7 py-4 sm:px-8">
            <p className="min-w-0 text-sm text-slate-700">{a.newSupplier}</p>
            <button
              type="button"
              onClick={openApply}
              className="min-h-10 shrink-0 rounded-lg border border-[#22c55e] bg-white px-5 py-2 text-sm font-bold text-[#16a34a] hover:bg-emerald-50"
            >
              {a.registration}
            </button>
          </div>
        </div>
      </main>

      {applyOpen ? <PartnerApplicationForm open onClose={closeApply} /> : null}

      <footer className="px-4 pb-8 pt-2 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-600">
          <Link href="/about" className="hover:text-[#1A3B5D]">
            {common.aboutUs}
          </Link>
          <Link href="/terms" className="hover:text-[#1A3B5D]">
            {common.terms}
          </Link>
          <Link href="/privacy" className="hover:text-[#1A3B5D]">
            {common.privacy}
          </Link>
        </nav>
        <p className="mt-3 text-xs text-slate-400">
          {new Date().getFullYear()} © {SITE_NAME}
        </p>
        {/* keep locale flag visible for a11y parity with Localrent language control */}
        <span className="sr-only">
          <LocaleFlag locale={locale} />
        </span>
      </footer>
    </div>
  );
}
