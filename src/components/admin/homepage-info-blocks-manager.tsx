"use client";

import { useState } from "react";
import {
  HOMEPAGE_INFO_ICON_KEYS,
  HOMEPAGE_INFO_ICON_LABELS,
  resolveHomepageInfoIcon,
  type HomepageInfoIconKey,
} from "@/lib/catalog/homepage-info-icons";
import type { HomepageInfoBlock, HomepageInfoContent } from "@/lib/catalog/homepage-info";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { fillCount, infoAdminLabels, knownText } from "@/lib/i18n/known-record-text";

export function HomepageInfoBlocksManager({ initial }: { initial: HomepageInfoContent }) {
  const { dictionary, locale } = useAdminLocale();
  const c = dictionary.common;
  const labels = infoAdminLabels(locale);
  const show = (canonical: string, map?: Partial<Record<string, string>>) =>
    (map?.[locale] && map[locale]?.trim()) || knownText(locale, canonical);
  const [content, setContent] = useState(initial);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [headingsBusy, setHeadingsBusy] = useState(false);

  const why = content.blocks.filter((b) => b.section === "why").sort((a, b) => a.sortOrder - b.sortOrder);
  const how = content.blocks.filter((b) => b.section === "how").sort((a, b) => a.sortOrder - b.sortOrder);

  const saveHeadings = async () => {
    setError("");
    setHeadingsBusy(true);
    try {
      const res = await fetch("/api/admin/homepage/info-blocks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whyTitle: show(content.whyTitle, content.whyTitleI18n),
          howTitle: show(content.howTitle, content.howTitleI18n),
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setContent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setHeadingsBusy(false);
    }
  };

  const saveBlock = async (block: HomepageInfoBlock) => {
    setError("");
    setSavingId(block.id);
    try {
      const res = await fetch(`/api/admin/homepage/info-blocks/${block.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: show(block.title, block.titleI18n),
          body: show(block.body, block.bodyI18n),
          iconKey: block.iconKey,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setContent((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => (b.id === block.id ? { ...b, ...data } : b)),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  const patchLocal = (id: string, patch: Partial<HomepageInfoBlock>) => {
    setContent((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.id !== id) return b;
        if (locale === "en") return { ...b, ...patch };
        return {
          ...b,
          iconKey: patch.iconKey ?? b.iconKey,
          titleI18n:
            patch.title !== undefined ? { ...b.titleI18n, [locale]: patch.title } : b.titleI18n,
          bodyI18n: patch.body !== undefined ? { ...b.bodyI18n, [locale]: patch.body } : b.bodyI18n,
        };
      }),
    }));
  };

  const renderEditor = (block: HomepageInfoBlock, stepLabel?: string) => {
    const Icon = resolveHomepageInfoIcon(block.iconKey);
    return (
      <li key={block.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-sky-700">
            <Icon className="h-3.5 w-3.5" />
          </span>
          {stepLabel ? (
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{stepLabel}</span>
          ) : null}
        </div>
        <label className="block text-[11px] font-semibold text-slate-600">
          {labels.title}
          <input
            className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
            value={show(block.title, block.titleI18n)}
            onChange={(e) => patchLocal(block.id, { title: e.target.value })}
          />
        </label>
        <label className="mt-1.5 block text-[11px] font-semibold text-slate-600">
          {labels.description}
          <textarea
            className="mt-0.5 min-h-[56px] w-full rounded-lg border p-2 text-xs font-normal"
            value={show(block.body, block.bodyI18n)}
            onChange={(e) => patchLocal(block.id, { body: e.target.value })}
          />
        </label>
        <label className="mt-1.5 block text-[11px] font-semibold text-slate-600">
          {labels.icon}
          <select
            className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
            value={block.iconKey}
            onChange={(e) =>
              patchLocal(block.id, { iconKey: e.target.value as HomepageInfoIconKey })
            }
          >
            {HOMEPAGE_INFO_ICON_KEYS.map((key) => (
              <option key={key} value={key}>
                {knownText(locale, HOMEPAGE_INFO_ICON_LABELS[key])}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={savingId === block.id}
          onClick={() => void saveBlock(block)}
          className="mt-2 w-full rounded-lg bg-[#0b1f4b] py-1.5 text-xs font-bold text-white disabled:bg-slate-400"
        >
          {savingId === block.id ? c.saving : c.save}
        </button>
      </li>
    );
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div>
        <h2 className="text-base font-extrabold text-[#0b1f4b]">{dictionary.sections.infoBlocks}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{labels.help}</p>
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p> : null}

      <div className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 sm:grid-cols-2">
        <label className="block text-[11px] font-semibold text-slate-600">
          {labels.whySection}
          <input
            className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
            value={show(content.whyTitle, content.whyTitleI18n)}
            onChange={(e) =>
              setContent((prev) =>
                locale === "en"
                  ? { ...prev, whyTitle: e.target.value }
                  : { ...prev, whyTitleI18n: { ...prev.whyTitleI18n, [locale]: e.target.value } },
              )
            }
          />
        </label>
        <label className="block text-[11px] font-semibold text-slate-600">
          {labels.howSection}
          <input
            className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
            value={show(content.howTitle, content.howTitleI18n)}
            onChange={(e) =>
              setContent((prev) =>
                locale === "en"
                  ? { ...prev, howTitle: e.target.value }
                  : { ...prev, howTitleI18n: { ...prev.howTitleI18n, [locale]: e.target.value } },
              )
            }
          />
        </label>
        <button
          type="button"
          disabled={headingsBusy}
          onClick={() => void saveHeadings()}
          className="rounded-lg bg-sky-600 py-1.5 text-xs font-bold text-white disabled:bg-slate-400 sm:col-span-2"
        >
          {headingsBusy ? c.saving : c.save}
        </button>
      </div>

      <div>
        <h3 className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
          {fillCount(labels.whyCount, why.length)}
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{why.map((b) => renderEditor(b))}</ul>
      </div>

      <div>
        <h3 className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
          {fillCount(labels.howCount, how.length)}
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {how.map((b, i) => renderEditor(b, fillCount(labels.step, i + 1)))}
        </ul>
      </div>
    </div>
  );
}
