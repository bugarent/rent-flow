"use client";

import { useState } from "react";
import type { MappedCarModel } from "@/lib/catalog/car-models";
import type { PopularAirportsLayout } from "@/lib/catalog/popular-airports-layout";
import { summarizeMappedModels } from "@/lib/cars/category-mapping";
import { ImageCropUpload } from "@/components/admin/image-crop-upload";
import { MakeModelMultiSelect } from "@/components/admin/make-model-multi-select";
import { SortableAdminGrid } from "@/components/admin/sortable-admin-grid";
import { useAdminLocale } from "@/components/providers/admin-locale-context";
import { knownText } from "@/lib/i18n/known-record-text";
import { AirportCardTranslationsFields } from "@/components/admin/airport-card-translations-fields";
import {
  localizedAirportTitle,
  type AirportCardTranslations,
} from "@/lib/catalog/homepage-airport-i18n";

type Category = {
  id: string;
  slug: string;
  name: string;
  details: string;
  imageUrl: string;
  mappedModels?: MappedCarModel[];
  isActive?: boolean;
};
type Airport = {
  id: string;
  iata: string;
  title: string;
  imageUrl: string;
  infoText: string;
  translations?: AirportCardTranslations;
};

function blankAirportForm() {
  return { title: "", iata: "", imageUrl: "", infoText: "", translations: {} as AirportCardTranslations };
}

function blankCategoryForm() {
  return { name: "", imageUrl: "", mappedModels: [] as MappedCarModel[] };
}

export function HomepageContentManager({
  initialCategories,
  initialAirports,
  initialAirportsLayout = "grid",
}: {
  initialCategories: Category[];
  initialAirports: Airport[];
  initialAirportsLayout?: PopularAirportsLayout;
}) {
  const { dictionary, locale } = useAdminLocale();
  const showRecord = (value: string) => knownText(locale, value);
  const e = dictionary.editor;
  const ui = dictionary.common;
  const fill = (template: string, values: Record<string, string | number>) =>
    Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
  const [categories, setCategories] = useState(initialCategories);
  const [airports, setAirports] = useState(initialAirports);
  const [airportsLayout, setAirportsLayout] = useState<PopularAirportsLayout>(initialAirportsLayout);
  const [savingLayout, setSavingLayout] = useState(false);
  const [error, setError] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingAirport, setSavingAirport] = useState(false);

  const [catForm, setCatForm] = useState(blankCategoryForm);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [panelForm, setPanelForm] = useState(blankCategoryForm);
  const [savingPanelCategory, setSavingPanelCategory] = useState(false);
  const [airForm, setAirForm] = useState(blankAirportForm);
  const [editingAirport, setEditingAirport] = useState<Airport | null>(null);

  const visibleCategories = categories.filter((c) => c.isActive !== false);

  async function readJsonResponse<T>(res: Response): Promise<T> {
    const text = await res.text();
    if (!text.trim()) {
      throw new Error(res.ok ? "Empty response from server" : `Request failed (${res.status})`);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(res.ok ? "Invalid JSON from server" : text.slice(0, 160) || `Request failed (${res.status})`);
    }
  }

  const refreshAirports = async () => {
    const res = await fetch("/api/admin/homepage/airports");
    const data = await readJsonResponse<Airport[] | { error?: string }>(res);
    if (!res.ok || !Array.isArray(data)) {
      throw new Error("Could not reload airports");
    }
    setAirports(data);
  };

  const resetCategoryForm = () => {
    setCatForm(blankCategoryForm());
    setEditingCategory(null);
  };

  const startEditCategory = (c: Category) => {
    setEditingCategory(c);
    setCatForm({
      name: c.name,
      imageUrl: c.imageUrl,
      mappedModels: c.mappedModels ?? [],
    });
  };

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!catForm.name.trim()) {
      setError(e.categoryNameRequired);
      return;
    }
    if (!catForm.imageUrl.trim()) {
      setError(e.imageRequired);
      return;
    }
    setSavingCategory(true);
    try {
      const payload = {
        name: catForm.name.trim(),
        imageUrl: catForm.imageUrl.trim(),
        mappedModels: catForm.mappedModels,
        details: summarizeMappedModels(catForm.mappedModels),
      };
      const url = editingCategory
        ? `/api/admin/homepage/categories/${editingCategory.id}`
        : "/api/admin/homepage/categories";
      const res = await fetch(url, {
        method: editingCategory ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJsonResponse<Category & { error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || e.couldNotSaveCategory);
      }
      if (!data.id) {
        throw new Error("Server did not return the saved category");
      }
      setCategories((prev) => {
        if (editingCategory) {
          return prev.map((c) => (c.id === data.id ? { ...c, ...data } : c));
        }
        if (prev.some((c) => c.id === data.id)) {
          return prev.map((c) => (c.id === data.id ? { ...c, ...data } : c));
        }
        return [...prev, data];
      });
      resetCategoryForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : e.couldNotSaveCategory);
    } finally {
      setSavingCategory(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm(e.deleteCategoryConfirm)) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/homepage/categories/${id}`, { method: "DELETE" });
      const data = await readJsonResponse<{ ok?: boolean; error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || e.couldNotDeleteCategory);
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (editingCategory?.id === id) resetCategoryForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : e.couldNotDeleteCategory);
    }
  };

  const toggleCategoryActive = async (id: string, isActive: boolean) => {
    setError("");
    setTogglingId(id);
    const previous = categories;
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, isActive } : c)));
    try {
      const res = await fetch(`/api/admin/homepage/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const data = await readJsonResponse<Category & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || e.couldNotUpdateVisibility);
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...data, isActive } : c)));
    } catch (err) {
      setCategories(previous);
      setError(err instanceof Error ? err.message : e.couldNotUpdateVisibility);
    } finally {
      setTogglingId(null);
    }
  };

  const addCategoryFromPanel = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!panelForm.name.trim()) {
      setError(e.categoryNameRequired);
      return;
    }
    if (!panelForm.imageUrl.trim()) {
      setError(e.imageRequired);
      return;
    }
    setSavingPanelCategory(true);
    try {
      const payload = {
        name: panelForm.name.trim(),
        imageUrl: panelForm.imageUrl.trim(),
        mappedModels: panelForm.mappedModels,
        details: summarizeMappedModels(panelForm.mappedModels),
      };
      const res = await fetch("/api/admin/homepage/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJsonResponse<Category & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error || e.couldNotSaveCategory);
      setCategories((prev) => {
        if (prev.some((c) => c.id === data.id)) {
          return prev.map((c) => (c.id === data.id ? { ...c, ...data, isActive: true } : c));
        }
        return [...prev, { ...data, isActive: true }];
      });
      setPanelForm(blankCategoryForm());
    } catch (err) {
      setError(err instanceof Error ? err.message : e.couldNotSaveCategory);
    } finally {
      setSavingPanelCategory(false);
    }
  };

  const saveAirport = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const payload = editingAirport ?? airForm;
    if (!payload.title.trim() || !payload.iata.trim()) {
      setError(e.airportRequired);
      return;
    }
    if (!payload.imageUrl.trim()) {
      setError(e.imageRequired);
      return;
    }
    setSavingAirport(true);
    try {
      const url = editingAirport
        ? `/api/admin/homepage/airports/${editingAirport.id}`
        : "/api/admin/homepage/airports";
      const res = await fetch(url, {
        method: editingAirport ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title.trim(),
          iata: payload.iata.trim(),
          imageUrl: payload.imageUrl.trim(),
          infoText: (payload.infoText || "").trim(),
          translations: payload.translations || {},
        }),
      });
      const data = await readJsonResponse<Airport & { error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || e.couldNotSaveAirport);
      }
      if (!data.id) {
        throw new Error("Server did not return the saved airport");
      }
      setAirports((prev) => {
        if (editingAirport) {
          return prev.map((a) => (a.id === data.id ? { ...a, ...data } : a));
        }
        if (prev.some((a) => a.id === data.id)) {
          return prev.map((a) => (a.id === data.id ? { ...a, ...data } : a));
        }
        return [...prev, data];
      });
      setAirForm(blankAirportForm());
      setEditingAirport(null);
      try {
        await refreshAirports();
      } catch {
        /* list already updated from response */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : e.couldNotSaveAirport);
    } finally {
      setSavingAirport(false);
    }
  };

  const deleteAirport = async (id: string) => {
    if (!confirm(e.deleteAirportConfirm)) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/homepage/airports/${id}`, { method: "DELETE" });
      const data = await readJsonResponse<{ ok?: boolean; error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || e.couldNotDeleteAirport);
      }
      setAirports((prev) => prev.filter((a) => a.id !== id));
      if (editingAirport?.id === id) {
        setEditingAirport(null);
        setAirForm(blankAirportForm());
      }
      try {
        await refreshAirports();
      } catch {
        /* list already updated locally */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : e.couldNotDeleteAirport);
    }
  };

  const reorderCategories = async (nextVisible: Category[]) => {
    const previous = categories;
    const inactive = categories.filter((c) => c.isActive === false);
    const merged = [...nextVisible, ...inactive];
    setCategories(merged);
    setError("");
    try {
      const res = await fetch("/api/admin/homepage/categories/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: merged.map((c) => c.id) }),
      });
      const data = await readJsonResponse<Category[] | { error?: string }>(res);
      if (!res.ok) {
        throw new Error(
          data && typeof data === "object" && "error" in data && data.error
            ? String(data.error)
            : e.couldNotSaveCategoryOrder,
        );
      }
      if (Array.isArray(data)) setCategories(data);
    } catch (err) {
      setCategories(previous);
      setError(err instanceof Error ? err.message : e.couldNotSaveCategoryOrder);
    }
  };

  const reorderAirports = async (next: Airport[]) => {
    const previous = airports;
    setAirports(next);
    setError("");
    try {
      const res = await fetch("/api/admin/homepage/airports/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next.map((a) => a.id) }),
      });
      const data = await readJsonResponse<Airport[] | { error?: string }>(res);
      if (!res.ok) {
        throw new Error(
          data && typeof data === "object" && "error" in data && data.error
            ? String(data.error)
            : e.couldNotSaveAirportOrder,
        );
      }
      if (Array.isArray(data)) setAirports(data);
    } catch (err) {
      setAirports(previous);
      setError(err instanceof Error ? err.message : e.couldNotSaveAirportOrder);
    }
  };

  const saveAirportsLayout = async (layout: PopularAirportsLayout) => {
    const previous = airportsLayout;
    setAirportsLayout(layout);
    setError("");
    setSavingLayout(true);
    try {
      const res = await fetch("/api/admin/homepage/airports/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      });
      const data = await readJsonResponse<{ layout?: PopularAirportsLayout; error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || e.couldNotSaveLayout);
      }
      if (data.layout === "grid" || data.layout === "slider") {
        setAirportsLayout(data.layout);
      }
    } catch (err) {
      setAirportsLayout(previous);
      setError(err instanceof Error ? err.message : e.couldNotSaveLayout);
    } finally {
      setSavingLayout(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      {error ? <p className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</p> : null}

      <section>
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#0b1f4b]">{dictionary.sections.categories}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{e.categoriesHelp}</p>
          </div>
          <div className="relative sm:min-w-[260px]">
            <button
              type="button"
              onClick={() => setManageOpen((v) => !v)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-[#0b1f4b] hover:border-sky-300 hover:bg-sky-50"
            >
              {manageOpen ? e.hideVisibility : e.manageVisibility}
              <span className="mt-0.5 block font-normal text-slate-500">
                {fill(e.enabledOnHomepage, { on: visibleCategories.length, total: categories.length })}
              </span>
            </button>
            {manageOpen ? (
              <div className="absolute end-0 z-20 mt-1 max-h-[420px] w-[min(100vw-2rem,320px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl sm:w-80">
                <p className="mb-2 text-[11px] text-slate-500">
                  {e.visibilityHelp}
                </p>
                <ul className="mb-3 space-y-1.5">
                  {categories.length === 0 ? (
                    <li className="text-xs text-slate-400">{e.noCategoriesYet}</li>
                  ) : (
                    categories.map((c) => {
                      const on = c.isActive !== false;
                      return (
                        <li
                          key={c.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2 py-1.5"
                        >
                          <span className="min-w-0 truncate text-xs font-semibold text-[#0b1f4b]">{showRecord(c.name)}</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            disabled={togglingId === c.id}
                            onClick={() => void toggleCategoryActive(c.id, !on)}
                            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                              on ? "bg-emerald-500" : "bg-slate-300"
                            } disabled:opacity-60`}
                          >
                            <span
                              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                                on ? "start-5" : "start-0.5"
                              }`}
                            />
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
                <form onSubmit={addCategoryFromPanel} className="space-y-2 border-t border-slate-100 pt-2">
                  <p className="text-[11px] font-bold text-[#0b1f4b]">{e.addCategory}</p>
                  <input
                    className="w-full rounded-lg border p-2 text-xs"
                    placeholder={e.categoryNamePh}
                    required
                    value={panelForm.name}
                    onChange={(e) => setPanelForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <MakeModelMultiSelect
                    value={panelForm.mappedModels}
                    onChange={(mappedModels) => setPanelForm((prev) => ({ ...prev, mappedModels }))}
                  />
                  <input
                    className="w-full rounded-lg border p-2 text-xs"
                    placeholder={e.imageUrl}
                    required
                    value={panelForm.imageUrl}
                    onChange={(e) => setPanelForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  />
                  <ImageCropUpload
                    onUploaded={(imageUrl) => setPanelForm((prev) => ({ ...prev, imageUrl }))}
                    onError={(message) => setError(message)}
                  />
                  <button
                    type="submit"
                    disabled={savingPanelCategory}
                    className="w-full rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-400"
                  >
                    {savingPanelCategory ? ui.saving : e.addAndShow}
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
        <SortableAdminGrid
          items={visibleCategories}
          onReorder={reorderCategories}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7"
          renderItem={(c) => {
            const mapped = c.mappedModels ?? [];
            return (
              <>
                <div className="aspect-[16/10] bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" />
                </div>
                <div className="p-2.5 sm:p-3">
                  <h3 className="mb-1 truncate text-sm font-bold text-[#0b1f4b] sm:text-base">{showRecord(c.name)}</h3>
                  <p className="mb-2 line-clamp-2 min-h-[2rem] text-[11px] leading-snug text-slate-500">
                    {mapped.length
                      ? summarizeMappedModels(mapped)
                      : c.details || e.noModelsMapped}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-sky-700"
                      onClick={() => startEditCategory(c)}
                    >
                      {e.editMap}
                    </button>
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-red-600"
                      onClick={() => deleteCategory(c.id)}
                    >
                      {ui.delete}
                    </button>
                  </div>
                </div>
              </>
            );
          }}
        />

        <form onSubmit={saveCategory} className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
          <h3 className="text-sm font-bold">{editingCategory ? e.updateCategory : e.addCategory}</h3>
          <input
            className="w-full rounded-lg border p-2 text-xs"
            placeholder={e.categoryNameExamplePh}
            required
            value={catForm.name}
            onChange={(e) => setCatForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <div>
            <p className="mb-1 text-[11px] font-semibold">{e.mappedModels}</p>
            <p className="mb-1.5 text-[10px] text-slate-500">{e.mappedModelsHelp}</p>
            <MakeModelMultiSelect
              value={catForm.mappedModels}
              onChange={(mappedModels) => setCatForm((prev) => ({ ...prev, mappedModels }))}
            />
          </div>
          <input
            className="w-full rounded-lg border p-2 text-xs"
            placeholder={e.imageUrl}
            required
            value={catForm.imageUrl}
            onChange={(e) => setCatForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
          />
          <ImageCropUpload
            onUploaded={(imageUrl) => setCatForm((prev) => ({ ...prev, imageUrl }))}
            onError={(message) => setError(message)}
          />
          {catForm.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={catForm.imageUrl} alt="" className="h-16 rounded-lg object-cover" />
          ) : null}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={savingCategory}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-400"
            >
              {savingCategory ? ui.saving : editingCategory ? e.saveChanges : e.addCategory}
            </button>
            {editingCategory ? (
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                onClick={resetCategoryForm}
              >
                {ui.cancel}
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="border-t border-slate-100 pt-4">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#0b1f4b]">{dictionary.sections.popularAirports}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{fill(e.cardsDrag, { n: airports.length })}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 sm:min-w-[240px]">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {e.homepageLayout}
            </p>
            <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={e.homepageLayout}>
              <button
                type="button"
                disabled={savingLayout}
                aria-pressed={airportsLayout === "slider"}
                onClick={() => saveAirportsLayout("slider")}
                className={`rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition disabled:opacity-60 ${
                  airportsLayout === "slider"
                    ? "border-sky-600 bg-sky-50 text-sky-800"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {e.slider}
                <span className="mt-0.5 block text-[10px] font-normal text-slate-500">{e.sliderHelp}</span>
              </button>
              <button
                type="button"
                disabled={savingLayout}
                aria-pressed={airportsLayout === "grid"}
                onClick={() => saveAirportsLayout("grid")}
                className={`rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition disabled:opacity-60 ${
                  airportsLayout === "grid"
                    ? "border-sky-600 bg-sky-50 text-sky-800"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {e.grid}
                <span className="mt-0.5 block text-[10px] font-normal text-slate-500">{e.gridHelp}</span>
              </button>
            </div>
          </div>
        </div>
        <SortableAdminGrid
          items={airports}
          onReorder={reorderAirports}
          className="grid max-h-[280px] gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3"
          renderItem={(a) => (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.imageUrl} alt={a.title} className="h-20 w-full object-cover" />
              <div className="p-2.5">
                <h3 className="text-sm font-bold text-[#0b1f4b]">{localizedAirportTitle(a, locale)}</h3>
                <p className="mb-2 text-[11px] text-slate-500">{a.iata}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-sky-700"
                    onClick={() => setEditingAirport(a)}
                  >
                    {ui.edit}
                  </button>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-red-600"
                    onClick={() => deleteAirport(a.id)}
                  >
                    {ui.delete}
                  </button>
                </div>
              </div>
            </>
          )}
        />

        <form onSubmit={saveAirport} className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
          <h3 className="text-sm font-bold">{editingAirport ? e.updateAirportCard : e.addAirportCard}</h3>
          <input
            className="w-full rounded-lg border p-2 text-xs"
            placeholder={e.airportTitlePh}
            required
            value={editingAirport ? editingAirport.title : airForm.title}
            onChange={(e) =>
              editingAirport
                ? setEditingAirport({ ...editingAirport, title: e.target.value })
                : setAirForm((prev) => ({ ...prev, title: e.target.value }))
            }
          />
          <input
            className="w-full rounded-lg border p-2 text-xs"
            placeholder={e.iataPh}
            required
            value={editingAirport ? editingAirport.iata : airForm.iata}
            onChange={(e) =>
              editingAirport
                ? setEditingAirport({ ...editingAirport, iata: e.target.value })
                : setAirForm((prev) => ({ ...prev, iata: e.target.value }))
            }
          />
          <input
            className="w-full rounded-lg border p-2 text-xs"
            placeholder={e.imageUrl}
            required
            value={editingAirport ? editingAirport.imageUrl : airForm.imageUrl}
            onChange={(e) =>
              editingAirport
                ? setEditingAirport({ ...editingAirport, imageUrl: e.target.value })
                : setAirForm((prev) => ({ ...prev, imageUrl: e.target.value }))
            }
          />
          <ImageCropUpload
            aspect={16 / 9}
            label={e.orUploadImage}
            onUploaded={(url) => {
              if (editingAirport) setEditingAirport((prev) => (prev ? { ...prev, imageUrl: url } : prev));
              else setAirForm((prev) => ({ ...prev, imageUrl: url }));
            }}
            onError={(message) => setError(message)}
          />
          {(editingAirport ? editingAirport.imageUrl : airForm.imageUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={editingAirport ? editingAirport.imageUrl : airForm.imageUrl}
              alt=""
              className="h-16 w-full max-w-xs rounded-lg object-cover"
            />
          ) : null}
          <label className="block text-xs font-bold text-[#0b1f4b]">
            {e.airportInfoLabel}
            <textarea
              className="mt-1 w-full rounded-lg border bg-white p-2 text-xs font-normal"
              rows={5}
              placeholder={e.airportInfoPh}
              value={editingAirport ? editingAirport.infoText || "" : airForm.infoText}
              onChange={(event) =>
                editingAirport
                  ? setEditingAirport({ ...editingAirport, infoText: event.target.value })
                  : setAirForm((prev) => ({ ...prev, infoText: event.target.value }))
              }
            />
          </label>
          <AirportCardTranslationsFields
            key={editingAirport?.id || "new"}
            adminLocale={locale}
            value={(editingAirport ? editingAirport.translations : airForm.translations) || {}}
            onChange={(translations) =>
              editingAirport
                ? setEditingAirport({ ...editingAirport, translations })
                : setAirForm((prev) => ({ ...prev, translations }))
            }
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={savingAirport}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white disabled:bg-slate-400"
            >
              {savingAirport ? ui.saving : editingAirport ? e.saveChanges : e.addAirport}
            </button>
            {editingAirport ? (
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                onClick={() => {
                  setEditingAirport(null);
                  setAirForm(blankAirportForm());
                }}
              >
                {ui.cancel}
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
