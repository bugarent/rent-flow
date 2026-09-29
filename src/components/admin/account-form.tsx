"use client";

import { useState } from "react";

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
        setError(data.error || "Failed to update credentials");
        return;
      }
      if (newPassword) setCurrentPassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      if (data.email) setLogin(data.email);
      setMessage("Credentials updated. Use the new login on the next sign-in.");
    } catch {
      setError("Failed to update credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-6">
      <label className="block text-sm font-semibold">
        Email
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
        Current password
        <input
          type="text"
          className="mt-1 w-full rounded-xl border p-3"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </label>
      <label className="block text-sm font-semibold">
        New password
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
        Confirm new password
        <input
          type="password"
          className="mt-1 w-full rounded-xl border p-3"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <p className="text-xs text-slate-500">Leave the new password fields blank to change only the login. The new password is stored with bcrypt.</p>
      <button disabled={loading} className="w-full rounded-xl bg-sky-600 py-3 font-bold text-white disabled:bg-slate-400">
        {loading ? "Saving..." : "Update credentials"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
    </form>
  );
}
