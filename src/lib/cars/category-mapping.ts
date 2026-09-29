import { modelKey, type MappedCarModel } from "@/lib/catalog/car-models";

export function parseMappedModels(value: unknown): MappedCarModel[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const make = "make" in item && typeof item.make === "string" ? item.make.trim() : "";
      const model = "model" in item && typeof item.model === "string" ? item.model.trim() : "";
      if (!make || !model) return null;
      return { make, model };
    })
    .filter((item): item is MappedCarModel => Boolean(item));
}

export function summarizeMappedModels(models: MappedCarModel[] | null | undefined, max = 4): string {
  if (!models?.length) return "";
  const labels = models.map((m) => `${m.make} ${m.model}`);
  if (labels.length <= max) return labels.join(", ");
  return `${labels.slice(0, max).join(", ")} +${labels.length - max} more`;
}

export function carMatchesMappedModels(make: string, model: string, mapped: MappedCarModel[]): boolean {
  const key = modelKey(make, model);
  return mapped.some((m) => modelKey(m.make, m.model) === key);
}
