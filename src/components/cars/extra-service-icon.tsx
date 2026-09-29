import {
  Baby,
  Bluetooth,
  Car,
  MapPinned,
  Mountain,
  Navigation,
  Package,
  Shield,
  Smartphone,
  UserPlus,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

function pickIcon(hay: string): LucideIcon {
  if (/baby|child|seat|საბავშვ|кресл|siège|kindersitz|fotelik/.test(hay)) return Baby;
  if (/gps|navigat|ნავიგ|навиг/.test(hay)) return Navigation;
  if (/sim|mobile.?data|ინტერნეტ|интернет/.test(hay)) return Smartphone;
  if (/wifi|wi-?fi/.test(hay)) return Wifi;
  if (/driver|მძღოლ|водител|fahrer|kierowc/.test(hay)) return UserPlus;
  if (/bluetooth/.test(hay)) return Bluetooth;
  if (/tpl|insur|დაზღვ|страхов|schutz|assurance/.test(hay)) return Shield;
  if (/route|pass|მარშრუტ|უღელტეხილ|mountain|მთა|запрещ|აკრძალ|ნებადართულ/.test(hay))
    return Mountain;
  if (/car|ავტო|авто/.test(hay)) return Car;
  if (/map|ადგილ|локац/.test(hay)) return MapPinned;
  return Package;
}

export function ExtraServiceIcon({
  name,
  slug,
  description,
  variant = "default",
  compact = false,
  className,
}: {
  name?: string;
  slug?: string;
  description?: string;
  variant?: "default" | "forbidden";
  compact?: boolean;
  className?: string;
}) {
  const hay = `${slug || ""} ${name || ""} ${description || ""}`.toLowerCase();
  const Icon = variant === "forbidden" ? Mountain : pickIcon(hay);
  const box = compact ? "h-7 w-7 rounded-md" : "h-10 w-10 rounded-lg";
  const glyph = compact ? "h-3.5 w-3.5" : "h-5 w-5";

  if (variant === "forbidden") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center border border-red-300 bg-white p-0.5",
          box,
          className,
        )}
        aria-hidden
      >
        <span className="flex h-full w-full items-center justify-center rounded-[inherit] bg-red-600 text-white">
          <Icon className={glyph} strokeWidth={2.25} />
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-slate-100 text-slate-600",
        box,
        className,
      )}
      aria-hidden
    >
      <Icon className={glyph} strokeWidth={1.75} />
    </span>
  );
}
