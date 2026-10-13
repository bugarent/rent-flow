/** Shows what the admin delivery limit means for partners: no limit (0), or a 0…limit price range. */
export function DeliveryLimitBadge({
  amount,
  symbol,
  freeLabel,
  rangeLabel,
}: {
  amount: string;
  symbol: string;
  freeLabel: string;
  rangeLabel: string;
}) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-800">
        {freeLabel}
      </span>
    );
  }
  return (
    <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-slate-500">
      {rangeLabel} {symbol}0–{symbol}
      {amount}
    </span>
  );
}
