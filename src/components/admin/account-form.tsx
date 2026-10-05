"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { uiText } from "@/lib/i18n/ui-text";

export function AdminAccountForm({
  email,
  currentPassword: initialPassword = "",
}: {
  email: string;
  currentPassword?: string;
}) {
  const [login, setLogin] = useState(email);
  const [currentPassword, setCurrentPassword] = useState(initialPassword);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const { locale } = useAdminLocale();
  const phrase = (en: string, ka: string, ru: string) => uiText(locale, en, ka, ru);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          email: login,
          newPassword: newPassword || undefined,
          confirmPassword: newPassword ? confirmPassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || phrase("Failed to update credentials", "მონაცემების განახლება ვერ მოხერხდა", "Не удалось обновить данные"));
        return;
      }
      if (newPassword) setCurrentPassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      if (data.email) setLogin(data.email);
      setMessage(
        phrase(
          "Credentials updated. Use the new login on the next sign-in.",
          "მონაცემები განახლდა. შემდეგ შესვლაზე გამოიყენეთ ახალი ლოგინი.",
          "Данные обновлены. При следующем входе используйте новый логин.",
        ),
      );
    } catch {
      setError(phrase("Failed to update credentials", "მონაცემების განახლება ვერ მოხერხდა", "Не удалось обновить данные"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-6">
      <label className="block text-sm font-semibold">
        {phrase("Email", "ელ. ფოსტა", "Эл. почта")}
        <input
          type="email"
          className="mt-1 w-full rounded-xl border p-3"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
        />
      </label>
      <label className="block text-sm font-semibold">
        {phrase("Current password", "მიმდინარე პაროლი", "Текущий пароль")}
        <div className="relative mt-1">
          <input
            type={showCurrentPassword ? "text" : "password"}
            className="w-full rounded-xl border p-3 pe-12"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="absolute inset-y-0 end-0 flex items-center px-3 text-slate-500 hover:text-slate-800"
            aria-label={
              showCurrentPassword
                ? phrase("Hide password", "პაროლის დამალვა", "Скрыть пароль")
                : phrase("Show password", "პაროლის ჩვენება", "Показать пароль")
            }
            aria-pressed={showCurrentPassword}
            onClick={() => setShowCurrentPassword((open) => !open)}
          >
            {showCurrentPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </label>
      <label className="block text-sm font-semibold">
        {phrase("New password", "ახალი პაროლი", "Новый пароль")}
        <input
          type="password"
          className="mt-1 w-full rounded-xl border p-3"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={5}
        />
      </label>
      <label className="block text-sm font-semibold">
        {phrase("Confirm new password", "გაიმეორეთ ახალი პაროლი", "Повторите новый пароль")}
        <input
          type="password"
          className="mt-1 w-full rounded-xl border p-3"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <p className="text-xs text-slate-500">
        {phrase(
          "Leave the new password fields blank to change only the login.",
          "ახალი პაროლის ველები ცარიელი დატოვეთ, თუ მხოლოდ ლოგინს ცვლით.",
          "Оставьте поля нового пароля пустыми, если меняете только логин.",
        )}
      </p>
      <button disabled={loading} className="min-h-11 w-full rounded-xl bg-sky-600 py-3 text-base font-bold text-white disabled:bg-slate-400">
        {loading ? phrase("Saving...", "ინახება...", "Сохранение...") : phrase("Update credentials", "მონაცემების განახლება", "Обновить данные")}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
    </form>
  );
}
