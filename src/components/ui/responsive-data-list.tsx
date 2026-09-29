import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Desktop: keep the table (or wide grid). Mobile: vertical card stack.
 * Tables that must stay scrollable can skip this and use overflow-x-auto alone.
 */
export function ResponsiveDataList({
  desktop,
  mobile,
  className,
  breakpoint = "md",
}: {
  desktop: ReactNode;
  mobile: ReactNode;
  className?: string;
  /** Show cards below this Tailwind breakpoint. */
  breakpoint?: "sm" | "md" | "lg";
}) {
  const hideDesktop =
    breakpoint === "sm" ? "sm:hidden" : breakpoint === "lg" ? "lg:hidden" : "md:hidden";
  const showDesktop =
    breakpoint === "sm" ? "hidden sm:block" : breakpoint === "lg" ? "hidden lg:block" : "hidden md:block";

  return (
    <div className={cn("min-w-0", className)}>
      <div className={cn(showDesktop, "overflow-x-auto")}>{desktop}</div>
      <div className={cn(hideDesktop, "space-y-3")}>{mobile}</div>
    </div>
  );
}

export function MobileDataCard({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "article";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white p-3.5 text-start shadow-sm",
        onClick && "active:bg-slate-50",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

export function MobileDataRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-slate-100 py-2 last:border-0 last:pb-0 first:pt-0",
        className,
      )}
    >
      <span className="shrink-0 pt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="min-w-0 max-w-[65%] text-end text-sm font-semibold text-[#0b1f4b]">{children}</div>
    </div>
  );
}
