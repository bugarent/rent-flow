import { cn } from "@/lib/utils";
import { SiteImage } from "@/components/ui/site-image";

/** Public partner brand row (logo + brand name) for car listings. */
export function PartnerBrandMark({
  name,
  logoUrl,
  className,
  size = "md",
}: {
  name?: string | null;
  logoUrl?: string | null;
  className?: string;
  size?: "sm" | "md";
}) {
  const label = (name || "").trim();
  if (!label && !logoUrl) return null;

  const box = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const text = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {logoUrl ? (
        <SiteImage
          src={logoUrl}
          alt=""
          width={size === "sm" ? 28 : 36}
          height={size === "sm" ? 28 : 36}
          className={cn(box, "shrink-0 rounded-md border border-slate-200 bg-white object-cover")}
        />
      ) : (
        <span
          className={cn(
            box,
            "inline-flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-[10px] font-bold uppercase text-slate-500",
          )}
          aria-hidden
        >
          {(label || "?").slice(0, 2)}
        </span>
      )}
      {label ? (
        <span className={cn(text, "font-semibold text-slate-700")}>{label}</span>
      ) : null}
    </div>
  );
}
