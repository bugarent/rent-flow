"use client";

import { useEffect, useState } from "react";
import type {
  HelpArticle,
  HelpCategory,
  HelpCenterConfig,
  HelpTopic,
} from "@/lib/catalog/help-center";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import {
  fillHelpCount,
  helpAdminLabels,
  helpText,
} from "@/lib/i18n/help-center-articles";

type Props = {
  initial: HelpCenterConfig;
};

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyArticle(): HelpArticle {
  return {
    id: newId("art"),
    question: "",
    answer: "",
    sortOrder: 0,
    trending: false,
  };
}

function emptyTopic(): HelpTopic {
  return {
    id: newId("topic"),
    title: "",
    sortOrder: 0,
    articles: [emptyArticle()],
  };
}

function emptyCategory(): HelpCategory {
  return {
    id: newId("cat"),
    title: "",
    sortOrder: 0,
    topics: [emptyTopic()],
  };
}

export function HelpCenterManager({ initial }: Props) {
  const { dictionary, locale } = useAdminLocale();
  const c = dictionary.common;
  const labels = helpAdminLabels(locale);
  const [categories, setCategories] = useState<HelpCategory[]>(initial.categories);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setCategories(initial.categories);
  }, [initial]);

  const save = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/help-center", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || c.failed);
      setCategories(Array.isArray(data.categories) ? data.categories : categories);
      setMessage(c.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.failed);
    } finally {
      setBusy(false);
    }
  };

  const draftKey = (id: string, field: string) => `${locale}:${id}:${field}`;
  const shown = (id: string, field: string, canonical: string) => {
    const edited = drafts[draftKey(id, field)];
    if (edited !== undefined) return edited;
    return helpText(locale, canonical);
  };
  const writeField = (id: string, field: string, value: string, writeCanonical: (value: string) => void) => {
    if (locale === "en") writeCanonical(value);
    else setDrafts((prev) => ({ ...prev, [draftKey(id, field)]: value }));
  };

  const updateCategory = (catId: string, patch: Partial<HelpCategory>) => {
    setCategories((prev) => prev.map((cat) => (cat.id === catId ? { ...cat, ...patch } : cat)));
  };

  const updateTopic = (catId: string, topicId: string, patch: Partial<HelpTopic>) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id !== catId
          ? cat
          : {
              ...cat,
              topics: cat.topics.map((t) => (t.id === topicId ? { ...t, ...patch } : t)),
            },
      ),
    );
  };

  const updateArticle = (
    catId: string,
    topicId: string,
    articleId: string,
    patch: Partial<HelpArticle>,
  ) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id !== catId
          ? cat
          : {
              ...cat,
              topics: cat.topics.map((t) =>
                t.id !== topicId
                  ? t
                  : {
                      ...t,
                      articles: t.articles.map((a) =>
                        a.id === articleId ? { ...a, ...patch } : a,
                      ),
                    },
              ),
            },
      ),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => setCategories((prev) => [...prev, emptyCategory()])}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
        >
          {labels.addCategory}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg bg-[#0b1f4b] px-3 py-2 text-xs font-bold text-white disabled:bg-slate-400"
        >
          {busy ? c.saving : c.save}
        </button>
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{message}</p> : null}

      <div className="space-y-4">
        {categories.map((cat, catIndex) => (
          <section
            key={cat.id}
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
          >
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1 text-[11px] font-semibold text-slate-600">
                {fillHelpCount(labels.category, catIndex + 1)}
                <input
                  className="mt-0.5 w-full rounded-lg border p-2 text-sm font-bold text-[#0b1f4b]"
                  value={shown(cat.id, "title", cat.title)}
                  disabled={busy}
                  onChange={(e) =>
                    writeField(cat.id, "title", e.target.value, (title) =>
                      updateCategory(cat.id, { title }),
                    )
                  }
                  placeholder={labels.categoryPh}
                />
              </label>
              <button
                type="button"
                disabled={busy}
                className="rounded-lg border border-red-200 px-2.5 py-2 text-[11px] font-semibold text-red-600 disabled:opacity-50"
                onClick={() => setCategories((prev) => prev.filter((c) => c.id !== cat.id))}
              >
                {c.delete}
              </button>
            </div>

            <div className="space-y-3">
              {cat.topics.map((topic, topicIndex) => (
                <div
                  key={topic.id}
                  className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5"
                >
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="min-w-0 flex-1 text-[11px] font-semibold text-slate-600">
                      {fillHelpCount(labels.topic, topicIndex + 1)}
                      <input
                        className="mt-0.5 w-full rounded-lg border bg-white p-2 text-xs font-bold text-slate-800"
                        value={shown(topic.id, "title", topic.title)}
                        disabled={busy}
                        onChange={(e) =>
                          writeField(topic.id, "title", e.target.value, (title) =>
                            updateTopic(cat.id, topic.id, { title }),
                          )
                        }
                        placeholder={labels.topicPh}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy}
                      className="text-[11px] font-semibold text-red-600 disabled:opacity-50"
                      onClick={() =>
                        updateCategory(cat.id, {
                          topics: cat.topics.filter((t) => t.id !== topic.id),
                        })
                      }
                    >
                      {labels.deleteTopic}
                    </button>
                  </div>

                  <ul className="space-y-2">
                    {topic.articles.map((article, articleIndex) => (
                      <li
                        key={article.id}
                        className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {fillHelpCount(labels.questionNo, articleIndex + 1)}
                          </p>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={Boolean(article.trending)}
                                disabled={busy}
                                onChange={(e) =>
                                  updateArticle(cat.id, topic.id, article.id, {
                                    trending: e.target.checked,
                                  })
                                }
                              />
                              {labels.trending}
                            </label>
                            <button
                              type="button"
                              disabled={busy}
                              className="text-[11px] font-semibold text-red-600 disabled:opacity-50"
                              onClick={() =>
                                updateTopic(cat.id, topic.id, {
                                  articles: topic.articles.filter((a) => a.id !== article.id),
                                })
                              }
                            >
                              {c.delete}
                            </button>
                          </div>
                        </div>
                        <label className="block text-[11px] font-semibold text-slate-600">
                          {labels.question}
                          <input
                            className="mt-0.5 w-full rounded-lg border p-2 text-xs font-normal"
                            value={shown(article.id, "question", article.question)}
                            disabled={busy}
                            onChange={(e) =>
                              writeField(article.id, "question", e.target.value, (question) =>
                                updateArticle(cat.id, topic.id, article.id, { question }),
                              )
                            }
                          />
                        </label>
                        <label className="block text-[11px] font-semibold text-slate-600">
                          {labels.answer}
                          <textarea
                            className="mt-0.5 min-h-[72px] w-full rounded-lg border p-2 text-xs font-normal"
                            value={shown(article.id, "answer", article.answer)}
                            disabled={busy}
                            onChange={(e) =>
                              writeField(article.id, "answer", e.target.value, (answer) =>
                                updateArticle(cat.id, topic.id, article.id, { answer }),
                              )
                            }
                          />
                        </label>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-50"
                    onClick={() =>
                      updateTopic(cat.id, topic.id, {
                        articles: [...topic.articles, emptyArticle()],
                      })
                    }
                  >
                    {labels.addQuestion}
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={busy}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 disabled:opacity-50"
              onClick={() =>
                updateCategory(cat.id, { topics: [...cat.topics, emptyTopic()] })
              }
            >
              {labels.addTopic}
            </button>
          </section>
        ))}
      </div>
    </div>
  );
}
