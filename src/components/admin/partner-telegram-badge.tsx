import { cn } from "@/lib/utils";
import { uiText } from "@/lib/i18n/ui-text";

/** Under the partner status: green when the Telegram bot is linked, red when it is not. */
export function PartnerTelegramBadge({
  active,
  locale,
  className,
}: {
  active: boolean;
  locale: string;
  className?: string;
}) {
  const label = active
    ? uiText(locale, "Telegram bot active", "Telegram ბოტი აქტიურია", "Telegram-бот активен")
    : uiText(
        locale,
        "Telegram bot not active",
        "Telegram ბოტი არ არის გააქტიურებული",
        "Telegram-бот не активирован",
      );
  return (
    <span
      title={label}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-0 text-[10px] font-semibold leading-4",
        active ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300" : "bg-red-100 text-red-700 ring-1 ring-red-300",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", active ? "bg-emerald-600" : "bg-red-600")}
      />
      <span className="truncate">{label}</span>
    </span>
  );
}
