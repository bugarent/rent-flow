import "server-only";

/** Operator live chat hours in Asia/Tbilisi (Georgia). */
export const OPERATOR_TZ = "Asia/Tbilisi";
export const OPERATOR_HOUR_START = 10;
export const OPERATOR_HOUR_END = 18;

export function isOperatorHours(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: OPERATOR_TZ,
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  return hour >= OPERATOR_HOUR_START && hour < OPERATOR_HOUR_END;
}

export function operatorHoursLabel(): string {
  return `${String(OPERATOR_HOUR_START).padStart(2, "0")}:00–${String(OPERATOR_HOUR_END).padStart(2, "0")}:00 (${OPERATOR_TZ})`;
}
