const PORTAL_AUTH_BASE = {
  admin: "/api/auth/admin",
  partner: "/api/auth/partner",
} as const;

export type PortalSignIn = keyof typeof PORTAL_AUTH_BASE;

/**
 * Posts to that portal's own NextAuth route.
 * `signIn()` from next-auth uses one shared base path, and the public site's
 * session provider overwrites it, so a partner login was checked as a customer.
 */
export async function signInOnPortal(
  portal: PortalSignIn,
  email: string,
  password: string,
  callbackUrl: string,
) {
  const basePath = PORTAL_AUTH_BASE[portal];
  const csrfRes = await fetch(`${basePath}/csrf`, { credentials: "same-origin" });
  if (!csrfRes.ok) return { error: "CredentialsSignin" as const };
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
