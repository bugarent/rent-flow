"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { LocaleFlag } from "@/components/brand/locale-flag";
import { PartnerLanguageSelect } from "@/components/partner/partner-language-select";
import { usePartnerLocale } from "@/components/providers/partner-locale-context";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { partnerLoginCopy } from "@/lib/i18n/partner-login-copy";
import { regionName } from "@/lib/i18n/place-label";
import { WORLD_COUNTRIES } from "@/lib/catalog/world-countries";
import { PARTNER_BASE, safePortalCallback } from "@/lib/routes";
import { SITE_NAME } from "@/lib/brand";

type Mode = "register" | "login";

function passwordOk(password: string) {
  return password.length >= 6 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function PartnerCompanyAuthScreen(_props?: { initialMode?: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = usePartnerLocale();
  const dictionary = getDictionary(locale);
  const t = dictionary.partner;
  const common = dictionary.common;
  const a = partnerLoginCopy(locale);

  // Partner login lands on sign-in; Registration is available from the footer button.
  const modeFromQuery = searchParams.get("mode");
  const startMode: Mode = modeFromQuery === "register" ? "register" : "login";

  const [mode, setMode] = useState<Mode>(startMode);
  const [country, setCountry] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(false);
  const [loading, setLoading] = useState(false);

  // Keep URL and view in sync (?mode=register only when on Registration).
  useEffect(() => {
    setMode(modeFromQuery === "register" ? "register" : "login");
  }, [modeFromQuery]);

  const switchMode = (next: Mode) => {
    setError("");
    setNotice(false);
    setMode(next);
    const url = new URL(window.location.href);
    if (next === "register") url.searchParams.set("mode", "register");
    else url.searchParams.delete("mode");
    window.history.replaceState({}, "", url.pathname + url.search);
  };

  const countries = useMemo(
    () =>
      WORLD_COUNTRIES.map((c) => ({ iso2: c.iso2, name: regionName(locale, c.iso2, c.name) })).sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [locale],
  );

  const callbackUrl = safePortalCallback(searchParams.get("callbackUrl"), "partner");
  const registeredNotice = searchParams.get("registered") === "1";

  const registerErrorMessage = (code?: string, fallback?: string) => {
    if (locale === "ka") {
      if (code === "NOT_MODERATED") {
        return "თქვენს მიერ შეყვანილ მეილს არ აქვს მოდერაცია გავლილი / დამტკიცებული. აქ რეგისტრაციისთვის საჭიროა ჯერ პარტნიორობის მოთხოვნის გაგზავნა (გახდი პარტნიორი) და ადმინისტრატორის მიერ მისი დაკმაყოფილება.";
      }
      if (code === "PENDING_MODERATION") {
        return "თქვენი პარტნიორობის განაცხადი ჯერ ადმინისტრატორის მოდერაციას ელოდება. რეგისტრაცია ხელმისაწვდომი იქნება დამტკიცების შემდეგ.";
      }
      if (code === "REJECTED") {
        return "ამ მეილის პარტნიორობის განაცხადი უარყოფილია. რეგისტრაცია შეუძლებელია, სანამ ახალი განაცხადი არ დამტკიცდება.";
      }
      if (code === "INVITE_EXPIRED") {
        return "მოწვევის ვადა ამოიწურა. გთხოვთ თავიდან გააგზავნოთ პარტნიორობის მოთხოვნა.";
      }
      if (code === "DB_OFFLINE" || code === "DB_REQUIRED") {
        return "რეგისტრაციის დასრულება ვერ მოხერხდა: სერვერის ბაზა გამორთულია. თუ მეილი ჯერ არ არის დამტკიცებული, ჯერ გააგზავნეთ პარტნიორობის მოთხოვნა.";
      }
      if (code === "EMAIL_TAKEN") {
        return "ეს მეილი უკვე დარეგისტრირებულია. გთხოვთ შეხვიდეთ სისტემაში.";
      }
      if (code === "WEAK_PASSWORD") {
        return "პაროლი უნდა შეიცავდეს ლათინურ ასოებს და ციფრებს.";
      }
      return (
        fallback ||
        "რეგისტრაციის დასრულება ვერ მოხერხდა. შესაძლოა შეყვანილ მეილს არ აქვს ადმინის მოდერაცია / დამტკიცება გავლილი."
      );
    }
    if (locale === "ru") {
      if (code === "NOT_MODERATED") {
        return "Указанный email не прошёл модерацию / одобрение. Для регистрации сначала отправьте заявку «Стать партнёром» и дождитесь одобрения администратора.";
      }
      if (code === "PENDING_MODERATION") {
        return "Ваша заявка ещё ожидает модерации администратора. Регистрация будет доступна после одобрения.";
      }
      if (code === "REJECTED") {
        return "Заявка по этому email отклонена. Регистрация недоступна, пока новая заявка не будет одобрена.";
      }
      return fallback || "Не удалось завершить регистрацию. Возможно, email ещё не одобрен администратором.";
    }
    if (code === "NOT_MODERATED") {
      return "The email you entered has not passed moderation / approval. To register here, first submit Become a Partner and wait for an administrator to approve it.";
    }
    if (code === "PENDING_MODERATION") {
      return "Your partner application is still awaiting administrator moderation. Registration will be available after approval.";
    }
    if (code === "REJECTED") {
      return "This email’s partner application was rejected. Registration is not available until a new application is approved.";
    }
    return (
      fallback ||
      "Registration could not be completed. The email may not be moderated/approved by an administrator yet."
    );
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    if (res?.error) {
      setLoading(false);
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
      setError("Invalid email or password");
      return;
    }
    try {
      await fetch("/api/partners/remember-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      /* admin-visible credentials are best-effort */
    }
    router.push(callbackUrl.startsWith(PARTNER_BASE) ? callbackUrl : PARTNER_BASE);
    router.refresh();
    setLoading(false);
  };

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice(false);
    if (!country) {
      setError("Choose a country");
      return;
    }
    if (!companyName.trim()) {
      setError("Enter the name of the company");
      return;
    }
    if (!email.trim()) {
      setError("Enter an email address");
      return;
    }
    if (!passwordOk(password)) {
      setError("The password must contain Latin letters, and numbers");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/partners/portal-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          companyName: companyName.trim(),
          countryIso2: country,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = typeof data.code === "string" ? data.code : undefined;
        const isNotice =
          code === "NOT_MODERATED" ||
          code === "PENDING_MODERATION" ||
          code === "REJECTED" ||
          code === "INVITE_EXPIRED";
        setNotice(Boolean(isNotice));
        setError(registerErrorMessage(code, data.error));
        return;
      }
      setMode("login");
      setNotice(false);
      setError("");
      setPassword("");
      {
        const url = new URL(window.location.href);
        url.searchParams.set("mode", "login");
        url.searchParams.set("registered", "1");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
      window.alert(a.submittedAlert);
    } catch {
      setNotice(true);
      setError(registerErrorMessage("SERVER"));
    } finally {
      setLoading(false);
    }
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
          {mode === "register" ? (
            <form onSubmit={onRegister} className="px-7 pb-6 pt-8 sm:px-8" noValidate>
              <h1 className="mb-6 text-[22px] font-bold leading-tight text-[#1A3B5D]">
                {a.registerTitle}
              </h1>

              {error ? (
                <p
                  className={
                    notice
                      ? "mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                      : "mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
                  }
                >
                  {error}
                </p>
              ) : null}

              <div className="space-y-3">
                <label className="block">
                  <span className="sr-only">{a.country}</span>
                  <select
                    className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none focus:border-[#22c55e]"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    required
                  >
                    <option value="">{a.chooseCountry}</option>
                    {countries.map((c) => (
                      <option key={c.iso2} value={c.iso2}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="sr-only">{a.companyName}</span>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#22c55e]"
                    placeholder={a.companyName}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    autoComplete="organization"
                  />
                </label>

                <label className="block">
                  <span className="sr-only">Email</span>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#22c55e]"
                    placeholder={a.emailAddress}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </label>

                <label className="block">
                  <span className="sr-only">Password</span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-3 pe-11 text-sm outline-none placeholder:text-slate-400 focus:border-[#22c55e]"
                      placeholder={a.thinkPassword}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
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

              <p className="mt-3 text-xs text-slate-500">
                {a.passwordRule}
              </p>

              <button
                type="submit"
                disabled={loading}
                className="mt-5 w-full rounded-lg bg-[#22c55e] py-3.5 text-base font-bold text-white hover:bg-[#16a34a] disabled:bg-slate-400"
              >
                {loading ? t.loading : a.register}
              </button>
            </form>
          ) : (
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
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-3 text-sm font-normal outline-none focus:border-[#22c55e]"
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
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-3 pe-11 text-sm font-normal outline-none focus:border-[#22c55e]"
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
          )}

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-7 py-4 sm:px-8">
            {mode === "register" ? (
              <>
                <p className="text-sm text-slate-700">{a.alreadyRegistered}</p>
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="rounded-lg border border-[#22c55e] bg-white px-5 py-2 text-sm font-bold text-[#16a34a] hover:bg-emerald-50"
                >
                  {a.login}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-700">{a.newSupplier}</p>
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="rounded-lg border border-[#22c55e] bg-white px-5 py-2 text-sm font-bold text-[#16a34a] hover:bg-emerald-50"
                >
                  {a.registration}
                </button>
              </>
            )}
          </div>
        </div>
      </main>

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
