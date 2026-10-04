import "server-only";

type NamedCar = {
  title?: string | null;
  make?: string | null;
  model?: string | null;
};

export type ResolvedBookingCar = {
  id: string;
  make: string;
  model: string;
  title: string;
  year: number;
  label: string;
  imageUrl: string | null;
  partnerLabel: string;
};

/** Public car name. Make and model win; the saved title covers a row that only has a title. */
export function carDisplayName(car: NamedCar | null | undefined, fallback = ""): string {
  if (!car) return fallback;
  const named = `${car.make || ""} ${car.model || ""}`.replace(/\s+/g, " ").trim();
  if (named) return named;
  const title = String(car.title || "")
    .replace(/\s+(19|20)\d{2}$/, "")
    .trim();
  return title || fallback;
}

/** File-store cars first, then Prisma, so a booking never falls back to a raw id. */
export async function loadCarsByIds(ids: string[]): Promise<Map<string, ResolvedBookingCar>> {
  const wanted = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  const out = new Map<string, ResolvedBookingCar>();
  if (!wanted.length) return out;

  const { listFileCars } = await import("@/lib/server/partner-cars-store");
  const fileCars = await listFileCars().catch(() => []);
  for (const car of fileCars) {
    if (!wanted.includes(car.id)) continue;
    out.set(car.id, {
      id: car.id,
      make: car.make || "",
      model: car.model || "",
      title: car.title || "",
      year: Number(car.year) || 0,
      label: carDisplayName(car),
      imageUrl: car.photos?.[0] || null,
      partnerLabel: car.partnerName || car.partnerEmail || car.partnerId || "",
    });
  }

  const missing = wanted.filter((id) => !out.get(id)?.label);
  if (!missing.length) return out;

  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.car.findMany({
      where: { id: { in: missing } },
      select: {
        id: true,
        make: true,
        model: true,
        title: true,
        year: true,
        photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        partner: { select: { companyName: true, email: true } },
      },
    });
    for (const car of rows) {
      const prev = out.get(car.id);
      const label = carDisplayName(car) || prev?.label || "";
      out.set(car.id, {
        id: car.id,
        make: car.make || prev?.make || "",
        model: car.model || prev?.model || "",
        title: car.title || prev?.title || "",
        year: Number(car.year) || prev?.year || 0,
        label,
        imageUrl: car.photos?.[0]?.url || prev?.imageUrl || null,
        partnerLabel: car.partner?.companyName || car.partner?.email || prev?.partnerLabel || "",
      });
    }
  } catch {
    /* file names still apply */
  }

  return out;
}
