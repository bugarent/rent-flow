export type IcalEvent = {
  uid: string;
  summary: string;
  start: string;
  end: string;
};

function unfold(text: string) {
  return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

/** iCal DATE or DATE-TIME. All-day DTEND is exclusive, matching the spec. */
export function parseIcalInstant(value: string): Date | null {
  const v = value.trim();
  if (/^\d{8}$/.test(v)) {
    const d = new Date(`${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] ? "Z" : ""}`;
  const d = new Date(m[7] ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseIcalEvents(text: string): IcalEvent[] {
  const unfolded = unfold(String(text || ""));
  const chunks = unfolded.split(/BEGIN:VEVENT/i).slice(1);
  const out: IcalEvent[] = [];
  for (const chunk of chunks) {
    const body = (chunk.split(/END:VEVENT/i)[0] || "").split(/\r?\n/);
    let uid = "";
    let summary = "";
    let start = "";
    let end = "";
    for (const line of body) {
      const idx = line.indexOf(":");
      if (idx < 1) continue;
      const key = line.slice(0, idx).split(";")[0].trim().toUpperCase();
      const value = line.slice(idx + 1).trim();
      if (key === "UID") uid = value;
      else if (key === "SUMMARY") summary = unescapeIcal(value);
      else if (key === "DTSTART") start = value;
      else if (key === "DTEND") end = value;
    }
    const a = parseIcalInstant(start);
    const b = parseIcalInstant(end);
    if (!a || !b || b.getTime() <= a.getTime()) continue;
    out.push({
      uid: uid || `${a.toISOString()}_${b.toISOString()}`,
      summary: summary || "Busy",
      start: a.toISOString(),
      end: b.toISOString(),
    });
    if (out.length >= 400) break;
  }
  return out;
}

function unescapeIcal(value: string) {
  return value.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function escapeIcal(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function formatUtc(date: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}T${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`;
}

export function buildIcalCalendar(input: { name: string; events: IcalEvent[] }) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RentAirportCars//Channel Manager//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcal(input.name)}`,
  ];
  const stamp = formatUtc(new Date());
  for (const event of input.events) {
    const start = new Date(event.start);
    const end = new Date(event.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcal(event.uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatUtc(start)}`,
      `DTEND:${formatUtc(end)}`,
      `SUMMARY:${escapeIcal(event.summary || "Reserved")}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
