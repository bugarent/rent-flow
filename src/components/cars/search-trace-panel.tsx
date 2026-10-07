export type SearchTraceRow = { id: string; label: string; reason: string };

/** Admin-only (`?debug=1`): why each listing was left out of this search. */
export function SearchTracePanel({ rows }: { rows: SearchTraceRow[] }) {
  return (
    <section className="mx-auto mt-4 w-full max-w-6xl px-4">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
        <p className="mb-2 font-extrabold">Search debug — excluded listings ({rows.length})</p>
        {rows.length ? (
          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={`${row.id}-${row.reason}`} className="break-words">
                <span className="font-bold">{row.label}</span>
                <span className="text-amber-800"> · {row.id}</span> — {row.reason}
              </li>
            ))}
          </ul>
        ) : (
          <p>Every approved listing matching the pickup is shown.</p>
        )}
      </div>
    </section>
  );
}
