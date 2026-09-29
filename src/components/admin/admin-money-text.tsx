"use client";

import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { cn } from "@/lib/utils";

/** Instant display of a EUR-stored amount in the admin's selected currency. */
export function AdminMoneyText({
  amountEur,
  className,
}: {
  amountEur: number;
  className?: string;
}) {
  const { formatEur } = useAdminLocale();
  return <span className={cn("tabular-nums", className)}>{formatEur(amountEur)}</span>;
}
