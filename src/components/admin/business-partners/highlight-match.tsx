import type { ReactNode } from "react";

/** Highlight case-insensitive occurrences of `query` inside `text` with a yellow mark. */
export function HighlightMatch({
  text,
  query,
}: {
  text: string;
  query: string;
}): ReactNode {
  const value = String(text ?? "");
  const q = query.trim();
  if (!q || !value) return value;

  const lower = value.toLowerCase();
  const needle = q.toLowerCase();
  const parts: ReactNode[] = [];
  let start = 0;
  let idx = lower.indexOf(needle, start);
  let key = 0;

  while (idx >= 0) {
    if (idx > start) parts.push(value.slice(start, idx));
    parts.push(
      <mark
        key={`h-${key++}`}
        className="rounded-sm bg-amber-300 px-0.5 text-inherit"
      >
        {value.slice(idx, idx + needle.length)}
      </mark>,
    );
    start = idx + needle.length;
    idx = lower.indexOf(needle, start);
  }
  if (start < value.length) parts.push(value.slice(start));
  return parts.length ? <>{parts}</> : value;
}
