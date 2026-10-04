import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { verifySecret, normalizeLogin } from "@/lib/crypto";
import {
  AUTH_BASE_PATHS,
  AUTH_COOKIE_PREFIX,
  AUTH_SIGNIN_PAGES,
  type AuthPortal,
  sessionCookieName,
  shouldUseSecureAuthCookies,
} from "@/lib/auth/portals";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: shouldUseSecureAuthCookies(),
  };
}

function portalCookies(portal: AuthPortal): NextAuthOptions["cookies"] {
  const prefix = AUTH_COOKIE_PREFIX[portal];
  const secure = shouldUseSecureAuthCookies();
  const opts = cookieOptions();
  return {
    sessionToken: {
      name: sessionCookieName(portal),
      options: opts,
    },
    csrfToken: {
      name: secure ? `__Secure-${prefix}.csrf-token` : `${prefix}.csrf-token`,
      options: opts,
    },
    callbackUrl: {
      name: secure ? `__Secure-${prefix}.callback-url` : `${prefix}.callback-url`,
      options: opts,
    },
  };
}

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

async function authorizeForPortal(
  credentials: Record<"email" | "password", string> | undefined,
  portal: AuthPortal,
): Promise<AuthUser | null> {
  if (!credentials?.email || !credentials?.password) return null;

  const login = normalizeLogin(credentials.email);
  const { prisma } = await import("@/lib/prisma");
  const {
    loadLocalAdmin,
    provisionLocalAdmin,
    saveLocalAdmin,
    TEST_ADMIN_EMAIL,
    bootstrapAdminPassword,
    LOCAL_ADMIN_ID,
  } = await import("@/lib/auth/local-admin-store");
  const { loadLocalPartner, provisionLocalPartner } = await import("@/lib/auth/local-partner-store");
  const { findLocalCustomerByEmail } = await import("@/lib/auth/local-customer-store");
  try {
    provisionLocalAdmin();
    provisionLocalPartner();
  } catch {
    // Read-only serverless filesystem must not abort password checks.
  }

  let databaseReached = false;
  try {
    const user = await prisma.user.findUnique({
      where: { email: login },
    });
    databaseReached = true;
    if (user && verifySecret(credentials.password, user.passwordHash)) {
      if (user.status === "PENDING_OTP") return null;
      if (user.status === "PENDING_APPROVAL") return null;
      if (user.status !== "ACTIVE") return null;

      if (portal === "admin") {
        if (user.role !== "ADMIN") return null;
        try {
          saveLocalAdmin({
            email: user.email,
            passwordHash: user.passwordHash,
            passwordPlain: credentials.password,
          });
        } catch {
          /* password display mirror is best-effort */
        }
      } else if (portal === "partner") {
        if (user.role !== "VENDOR") return null;
        const { partnerCanAccessPortal } = await import("@/lib/auth/partner-access");
        let partner = await prisma.partner.findUnique({ where: { userId: user.id } });
        if (!partner) {
          partner = await prisma.partner.findFirst({
            where: { email: user.email },
            orderBy: { updatedAt: "desc" },
          });
          if (partner && partnerCanAccessPortal(partner.status)) {
            await prisma.partner.update({
              where: { id: partner.id },
              data: { userId: user.id, status: "APPROVED" },
            });
          }
        }
        if (!partner || !partnerCanAccessPortal(partner.status)) return null;
        try {
          const { rememberPartnerPortalPassword } = await import(
            "@/lib/server/partner-credentials-store"
          );
          await rememberPartnerPortalPassword(partner.id, user.email, credentials.password);
        } catch {
          /* credentials mirror is best-effort for admin display */
        }
      } else if (user.role === "VENDOR") {
        // The public session provider can send this form to the customer
        // auth route. An approved partner must still be accepted there.
        const { partnerCanAccessPortal } = await import("@/lib/auth/partner-access");
        let partner = await prisma.partner.findUnique({ where: { userId: user.id } });
        if (!partner) {
          partner = await prisma.partner.findFirst({
            where: { email: user.email },
            orderBy: { updatedAt: "desc" },
          });
        }
        if (!partner || !partnerCanAccessPortal(partner.status)) return null;
      } else if (user.role !== "CUSTOMER") {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
      };
    }
  } catch {
    // Fall through to local stores when the database is unavailable.
  }

  const bootstrapPassword = bootstrapAdminPassword();
  if (
    portal === "admin" &&
    !databaseReached &&
    Boolean(bootstrapPassword) &&
    login === normalizeLogin(TEST_ADMIN_EMAIL) &&
    credentials.password === bootstrapPassword
  ) {
    return {
      id: LOCAL_ADMIN_ID,
      email: TEST_ADMIN_EMAIL,
      name: "Platform Admin",
      role: "ADMIN",
    };
  }

  if (portal === "admin") {
    const local = loadLocalAdmin();
    if (
      local &&
      normalizeLogin(local.email) === login &&
      local.status === "ACTIVE" &&
      verifySecret(credentials.password, local.passwordHash)
    ) {
      try {
        saveLocalAdmin({ passwordPlain: credentials.password });
      } catch {
        /* password display mirror is best-effort */
      }
      return {
        id: local.id,
        email: local.email,
        name: "Platform Admin",
        role: local.role,
      };
    }
  }

  if (portal === "partner") {
    const localPartner = loadLocalPartner();
    if (localPartner && localPartner.status === "ACTIVE" && verifySecret(credentials.password, localPartner.passwordHash)) {
      let emailMatch = localPartner.email === login;
      if (!emailMatch) {
        try {
          const { readCompanySettingsFile } = await import("@/lib/server/partner-company-settings-store");
          const settings = await readCompanySettingsFile(localPartner.id);
          if (settings?.email && normalizeLogin(settings.email) === login) {
            emailMatch = true;
            const { saveLocalPartner } = await import("@/lib/auth/local-partner-store");
            saveLocalPartner({ email: login });
          }
        } catch {
          /* ignore */
        }
      }
      if (emailMatch) {
        try {
          const { rememberPartnerPortalPassword } = await import(
            "@/lib/server/partner-credentials-store"
          );
          const { LOCAL_PARTNER_ID } = await import("@/lib/auth/local-partner-store");
          await rememberPartnerPortalPassword(LOCAL_PARTNER_ID, login, credentials.password);
          if (localPartner.id !== LOCAL_PARTNER_ID) {
            await rememberPartnerPortalPassword(localPartner.id, login, credentials.password);
          }
        } catch {
          /* credentials mirror is best-effort for admin display */
        }
        return {
          id: localPartner.id,
          email: login,
          name: "Test Partner",
          role: localPartner.role,
        };
      }
    }

    try {
      const { signInApprovedPartnerWithStoredPassword } = await import(
        "@/lib/server/activate-partner-login"
      );
      const opened = await signInApprovedPartnerWithStoredPassword(login, credentials.password);
      if (opened) return opened;
    } catch {
      /* application password is used only when the cabinet user is missing or stale */
    }
  }

  if (portal === "customer") {
    try {
      const { signInApprovedPartnerWithStoredPassword } = await import(
        "@/lib/server/activate-partner-login"
      );
      const opened = await signInApprovedPartnerWithStoredPassword(login, credentials.password);
      if (opened) return opened;
    } catch {
      /* same application password, even if the form posted to the customer route */
    }
  }

  if (portal === "customer") {
    const localCustomer = findLocalCustomerByEmail(login);
    if (
      localCustomer &&
      localCustomer.status === "ACTIVE" &&
      verifySecret(credentials.password, localCustomer.passwordHash)
    ) {
      return {
        id: localCustomer.id,
        email: localCustomer.email,
        name: `${localCustomer.firstName} ${localCustomer.lastName}`,
        role: localCustomer.role,
      };
    }
  }

  return null;
}

function buildAuthOptions(portal: AuthPortal): NextAuthOptions {
  return {
    secret: process.env.NEXTAUTH_SECRET ?? "dev-rentairportcars-secret",
    session: {
      strategy: "jwt",
      // Partner must re-authenticate with email/password after sign-out / idle logout.
      // Absolute JWT lifetime; idle timeout (5 min) is enforced in the partner cabinet UI.
      maxAge: portal === "partner" ? 60 * 60 * 12 : 30 * 24 * 60 * 60,
      updateAge: portal === "partner" ? 5 * 60 : 24 * 60 * 60,
    },
    pages: {
      signIn: AUTH_SIGNIN_PAGES[portal],
    },
    cookies: portalCookies(portal),
    providers: [
      CredentialsProvider({
        id: "credentials",
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          return authorizeForPortal(credentials, portal);
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.role = (user as { role?: string }).role;
          token.id = user.id;
          token.portal = portal;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.role = token.role as string;
          session.user.id = token.id as string;
        }
        return session;
      },
    },
  };
}

export const customerAuthOptions = buildAuthOptions("customer");
export const adminAuthOptions = buildAuthOptions("admin");
export const partnerAuthOptions = buildAuthOptions("partner");

/** Consumer-website auth. Admin and partner portals use their own option objects. */
export const authOptions = customerAuthOptions;

export { AUTH_BASE_PATHS };
