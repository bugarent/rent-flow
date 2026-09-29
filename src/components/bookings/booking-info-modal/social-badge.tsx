import type { PartnerSocialPlatform } from "@/lib/partner";
import { cn } from "@/lib/utils";
import { socialLabel } from "./helpers";

export function SocialBadge({
  platform,
  locale,
  compact = false,
}: {
  platform: PartnerSocialPlatform;
  locale: string;
  /** Smaller icon used only in calendar booking detail view. */
  compact?: boolean;
}) {
  const meta: Record<PartnerSocialPlatform, { className: string; path: string }> = {
    WHATSAPP: {
      className: "bg-[#25D366] text-white",
      path: "M12.04 2c-5.46 0-9.91 4.44-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.44 17.5 2 12.04 2zm5.79 14.09c-.24.68-1.4 1.25-1.94 1.33-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.83-4.21-4.98-4.41-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.26-.28.58-.35.77-.35h.55c.18 0 .42-.07.66.5.24.59.82 2.02.89 2.16.07.14.12.31.02.5-.1.2-.14.31-.28.48-.14.16-.3.37-.42.49-.14.14-.28.29-.12.56.16.28.7 1.16 1.5 1.88 1.04.92 1.91 1.21 2.18 1.35.28.14.44.12.6-.07.16-.2.7-.82.89-1.1.18-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.46.21.53.33.07.12.07.68-.17 1.36z",
    },
    VIBER: {
      className: "bg-[#7360F2] text-white",
      path: "M12.04 2C7.4 2 4.1 5.08 4.1 9.4c0 2.18.9 4.15 2.35 5.55L5.2 22l5.28-2.76c.5.07 1.02.11 1.56.11 4.64 0 8.4-3.08 8.4-7.95C20.44 5.08 16.68 2 12.04 2zm3.7 11.35c-.18.5-.88.95-1.24 1.01-.32.06-.72.08-1.16-.07-.27-.08-.61-.2-1.06-.39-1.86-.8-3.08-2.69-3.17-2.81-.1-.13-.75-1-.75-1.91 0-.9.48-1.35.65-1.54.16-.18.37-.22.49-.22h.35c.11 0 .27-.04.42.32.15.38.52 1.29.57 1.38.04.09.08.2.01.32-.06.13-.09.2-.18.3-.09.11-.19.23-.27.31-.09.09-.18.18-.08.36.1.18.45.74.96 1.2.66.59 1.22.77 1.39.86.18.09.28.07.38-.05.1-.12.45-.52.57-.7.12-.18.23-.15.4-.09.16.06 1.04.49 1.22.58.18.09.29.13.34.21.04.08.04.43-.11.87z",
    },
    TELEGRAM: {
      className: "bg-[#2AABEE] text-white",
      path: "M21.94 4.36 18.7 19.64c-.24 1.08-.88 1.35-1.78.84l-4.92-3.63-2.37 2.28c-.26.26-.48.48-.99.48l.35-5.02 9.14-8.26c.4-.35-.09-.55-.62-.2L6.27 13.3 1.41 11.78c-1.05-.33-1.07-1.05.22-1.56L20.53 3.3c.88-.33 1.65.2 1.41 1.06z",
    },
  };
  const m = meta[platform];
  const label = socialLabel(platform, locale);
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "group relative inline-flex items-center justify-center shadow-sm",
        compact ? "h-5 w-5 rounded-md" : "h-9 w-9 rounded-lg",
        m.className,
      )}
    >
      <svg viewBox="0 0 24 24" className={compact ? "h-3 w-3" : "h-4 w-4"} aria-hidden>
        <path fill="currentColor" d={m.path} />
      </svg>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100",
          compact ? "mb-1 px-1.5 py-0.5 text-[10px]" : "mb-1.5 px-2 py-1 text-[11px]",
        )}
      >
        {label}
      </span>
    </span>
  );
}
