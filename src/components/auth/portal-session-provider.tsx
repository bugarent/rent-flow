"use client";

import { SessionProvider } from "next-auth/react";
import { AUTH_BASE_PATHS, type AuthPortal } from "@/lib/auth/portals";

export function PortalSessionProvider({
  portal,
  children,
}: {
  portal: AuthPortal;
  children: React.ReactNode;
}) {
  return <SessionProvider basePath={AUTH_BASE_PATHS[portal]}>{children}</SessionProvider>;
}
