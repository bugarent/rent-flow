import "server-only";

export type CarDetailSeoRecord = {
  id: string;
  make: string;
  model: string;
  year: number;
  title: string;
  description: string;
  dailyRateEur: unknown;
  status: string;
  hiddenReason?: string | null;
  photos: Array<{ url: string }>;
};

export type CarDetailSeoLoad = {
  car: CarDetailSeoRecord | null;
  /** True when storage failed — do not emit noindex for a transient miss. */
  loadFailed: boolean;
};

function asSeoRecord(input: {
  id: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  title?: string | null;
  description?: string | null;
  dailyRateEur?: unknown;
  status: string;
  hiddenReason?: string | null;
  photos?: Array<{ url?: string | null } | string> | null;
}): CarDetailSeoRecord {
  const photos = (input.photos || [])
    .map((row) => (typeof row === "string" ? row : String(row?.url || "").trim()))
    .filter(Boolean)
    .map((url) => ({ url }));
  return {
    id: input.id,
    make: String(input.make || "").trim() || "Car",
    model: String(input.model || "").trim() || "",
    year: Number(input.year) || new Date().getFullYear(),
    title: String(input.title || "").trim(),
    description: String(input.description || "").trim(),
    dailyRateEur: input.dailyRateEur,
    status: String(input.status || ""),
    hiddenReason: input.hiddenReason ?? null,
    photos,
  };
}

/**
 * SEO record for /cars/[id]. Loads Prisma first, then public file-backed cars.
 * Transient DB failures set loadFailed instead of pretending the listing is
 * missing (which previously emitted noindex and blocked indexing).
 */
export async function loadCarDetailSeo(id: string): Promise<CarDetailSeoLoad> {
  const carId = String(id || "").trim();
  if (!carId) return { car: null, loadFailed: false };

  try {
    const { prisma } = await import("@/lib/prisma");
    let row: {
      id: string;
      make: string;
      model: string;
      year: number;
      title: string;
      description: string;
      dailyRateEur: unknown;
      status: string;
      hiddenReason: string | null;
      photos: Array<{ url: string }>;
    } | null = null;

    try {
      row = await prisma.car.findUnique({
        where: { id: carId },
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          title: true,
          description: true,
          dailyRateEur: true,
          status: true,
          hiddenReason: true,
          photos: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true },
          },
        },
      });
    } catch {
      // Fall through to file store; mark failure only if that also fails.
      row = null;
      try {
        const { getFileCar, isPublicFileCar } = await import("@/lib/server/partner-cars-store");
        const fileCar = await getFileCar(carId);
        if (fileCar && isPublicFileCar(fileCar)) {
          return {
            car: asSeoRecord({
              id: fileCar.id,
              make: fileCar.make,
              model: fileCar.model,
              year: fileCar.year,
              title: fileCar.title,
              description: fileCar.description,
              dailyRateEur: fileCar.dailyRateEur,
              status: fileCar.status,
              hiddenReason: fileCar.hiddenReason,
              photos: fileCar.photos,
            }),
            loadFailed: false,
          };
        }
        return { car: null, loadFailed: true };
      } catch {
        return { car: null, loadFailed: true };
      }
    }

    if (row) {
      return { car: asSeoRecord(row), loadFailed: false };
    }

    const { getFileCar, isPublicFileCar } = await import("@/lib/server/partner-cars-store");
    const fileCar = await getFileCar(carId);
    if (!fileCar) return { car: null, loadFailed: false };
    if (!isPublicFileCar(fileCar)) {
      return {
        car: asSeoRecord({
          id: fileCar.id,
          make: fileCar.make,
          model: fileCar.model,
          year: fileCar.year,
          title: fileCar.title,
          description: fileCar.description,
          dailyRateEur: fileCar.dailyRateEur,
          status: fileCar.status,
          hiddenReason: fileCar.hiddenReason,
          photos: fileCar.photos,
        }),
        loadFailed: false,
      };
    }
    return {
      car: asSeoRecord({
        id: fileCar.id,
        make: fileCar.make,
        model: fileCar.model,
        year: fileCar.year,
        title: fileCar.title,
        description: fileCar.description,
        dailyRateEur: fileCar.dailyRateEur,
        status: fileCar.status,
        hiddenReason: fileCar.hiddenReason,
        photos: fileCar.photos,
      }),
      loadFailed: false,
    };
  } catch {
    return { car: null, loadFailed: true };
  }
}
