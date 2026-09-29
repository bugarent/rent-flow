/** Default rental window for public search links (local calendar days). */
export function defaultSearchDateRange(opts?: { fromOffsetDays?: number; lengthDays?: number }) {
  const fromOffset = opts?.fromOffsetDays ?? 1;
  const length = Math.max(1, opts?.lengthDays ?? 7);
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() + fromOffset);
  const end = new Date(start);
  end.setDate(end.getDate() + length);

  const isoDay = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return {
    pickupDate: isoDay(start),
    dropoffDate: isoDay(end),
    startDate: `${isoDay(start)}T10:00`,
    endDate: `${isoDay(end)}T10:00`,
  };
}
