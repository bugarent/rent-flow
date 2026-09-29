import type { AdminDictionary } from "@/lib/i18n/admin-dictionaries";
import type { AdminExtra } from "@/lib/i18n/admin-dictionary-partial";
import { adminExtraPacks } from "@/lib/i18n/admin-extra-packs";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function deepFill<T>(base: T, patch: unknown): T {
  if (Array.isArray(base)) {
    return (Array.isArray(patch) && patch.length ? patch : base) as T;
  }
  if (isPlainObject(base)) {
    const over = isPlainObject(patch) ? patch : {};
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(base)) {
      out[key] = deepFill((base as Record<string, unknown>)[key], over[key]);
    }
    return out as T;
  }
  if (typeof patch === "string" && patch.trim()) return patch as T;
  return base;
}

/** Overlay a picker locale on the English admin dictionary. en/ka/ru stay exact. */
export function withAdminExtra(english: AdminDictionary, locale: string | null | undefined): AdminDictionary {
  const extra: AdminExtra | undefined = locale ? adminExtraPacks[locale] : undefined;
  return extra ? deepFill(english, extra) : english;
}
