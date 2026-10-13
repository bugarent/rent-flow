import { cn } from "@/lib/utils";

/** "Airports 3/2": total places in bold black, places with listing delivery in bold green. */
export function DeliveryCountRatio({
  label,
  total,
  active,
  activeTitle,
  className,
}: {
  label: string;
  total: number;
  active: number;
  /** Tooltip / screen-reader text for the green number. */
  activeTitle: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 whitespace-nowrap", className)}>
      <span className="font-semibold text-slate-600">{label}</span>
      <span className="font-black tabular-nums">
        <span className="text-slate-900">{total}</span>
        <span className="text-slate-400">/</span>
        <span className="text-emerald-700" title={activeTitle}>
          {active}
          <span className="sr-only"> {activeTitle}</span>
        </span>
      </span>
    </span>
  );
}
