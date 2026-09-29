"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CAR_MAKES_MODELS, modelKey, type MappedCarModel } from "@/lib/catalog/car-models";

export function MakeModelMultiSelect({
  value,
  onChange,
}: {
  value: MappedCarModel[];
  onChange: (next: MappedCarModel[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");

  const selectedKeys = useMemo(() => new Set(value.map((v) => modelKey(v.make, v.model))), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CAR_MAKES_MODELS;
    return CAR_MAKES_MODELS.map((entry) => ({
      make: entry.make,
      models: entry.models.filter(
        (model) => entry.make.toLowerCase().includes(q) || model.toLowerCase().includes(q),
      ),
    })).filter((entry) => entry.models.length > 0 || entry.make.toLowerCase().includes(q));
  }, [query]);

  const toggle = (make: string, model: string) => {
    const key = modelKey(make, model);
    if (selectedKeys.has(key)) {
      onChange(value.filter((v) => modelKey(v.make, v.model) !== key));
    } else {
      onChange([...value, { make, model }]);
    }
  };

  const label =
    value.length === 0
      ? "Select makes & models…"
      : value.length <= 2
        ? value.map((v) => `${v.make} ${v.model}`).join(", ")
        : `${value.length} models selected`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border bg-white p-3 text-left text-sm"
      >
        <span className={value.length ? "text-slate-900" : "text-slate-400"}>{label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {value.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((item) => (
            <button
              key={modelKey(item.make, item.model)}
              type="button"
              onClick={() => toggle(item.make, item.model)}
              className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 hover:bg-sky-100"
              title="Remove"
            >
              {item.make} {item.model} ×
            </button>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-hidden rounded-xl border bg-white shadow-lg">
          <div className="border-b p-2">
            <input
              autoFocus
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Search make or model…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.map((entry) => {
              const isOpen = expanded[entry.make] ?? Boolean(query.trim());
              return (
                <div key={entry.make} className="border-b border-slate-50 last:border-0">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                    onClick={() => setExpanded((prev) => ({ ...prev, [entry.make]: !isOpen }))}
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {entry.make}
                    <span className="ml-auto text-xs font-normal text-slate-400">
                      {entry.models.filter((m) => selectedKeys.has(modelKey(entry.make, m))).length}/{entry.models.length}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="pb-2 pl-8 pr-2">
                      {entry.models.map((model) => {
                        const checked = selectedKeys.has(modelKey(entry.make, model));
                        return (
                          <label
                            key={model}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(entry.make, model)}
                              className="rounded border-slate-300"
                            />
                            {model}
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {filtered.length === 0 ? (
              <p className="p-3 text-center text-sm text-slate-500">No makes or models match.</p>
            ) : null}
          </div>
          <div className="border-t p-2">
            <button
              type="button"
              className="w-full rounded-lg bg-slate-100 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
