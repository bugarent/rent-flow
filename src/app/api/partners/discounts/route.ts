import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { LOCAL_PARTNER_ID, loadLocalPartner } from "@/lib/auth/local-partner-store";
import { isDbOfflineError } from "@/lib/server/db-errors";
import { listFileCarsForPartner } from "@/lib/server/partner-cars-store";
import {
  createPeriodDiscount,
  deletePeriodDiscount,
  listPeriodDiscountsForPartner,
  updatePeriodDiscount,
  type PartnerPeriodDiscountKind,
} from "@/lib/server/partner-period-discounts-store";

async function resolvePartnerId(userId: string, email?: string | null): Promise<string> {
  try {
    const partner = await prisma.partner.findUnique({ where: { userId } });
    if (partner?.id) return partner.id;
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
  }
  const local = loadLocalPartner();
  if (userId === LOCAL_PARTNER_ID || local?.id === userId || (email && local?.email === email)) {
    return LOCAL_PARTNER_ID;
  }
  return userId || LOCAL_PARTNER_ID;
}

async function listPartnerCars(session: { user: { id: string; email?: string | null } }, partnerId: string) {
  type CarRow = {
    id: string;
    make: string;
    model: string;
    year: number;
    title: string;
    categorySlug: string | null;
    registrationNumber: string | null;
    status: string;
  };

  let cars: CarRow[] = [];
  try {
    if (partnerId && !partnerId.startsWith("file-partner-")) {
      cars = (
        await prisma.car.findMany({
          where: { partnerId },
          select: {
            id: true,
            make: true,
            model: true,
            year: true,
            title: true,
            categorySlug: true,
            registrationNumber: true,
            status: true,
          },
        })
      ).map((c) => ({
        id: c.id,
        make: c.make,
        model: c.model,
        year: c.year,
        title: c.title,
        categorySlug: c.categorySlug,
        registrationNumber: c.registrationNumber,
        status: String(c.status),
      }));
    }
  } catch (error) {
    if (!isDbOfflineError(error)) throw error;
    cars = [];
  }

  const fileCars = await listFileCarsForPartner({
    userId: session.user.id,
    email: session.user.email,
    partnerId,
  });
  const seen = new Set(cars.map((c) => c.id));
  for (const fileCar of fileCars) {
    if (seen.has(fileCar.id)) continue;
    cars.push({
      id: fileCar.id,
      make: fileCar.make,
      model: fileCar.model,
      year: fileCar.year,
      title: fileCar.title,
      categorySlug: fileCar.categorySlug,
      registrationNumber: fileCar.registrationNumber,
      status: fileCar.status,
    });
  }

  return cars;
}

export async function GET() {
  try {
    const session = await requirePartnerApi();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const partnerId = await resolvePartnerId(session.user.id, session.user.email);
    const [items, cars] = await Promise.all([
      listPeriodDiscountsForPartner(partnerId),
      listPartnerCars(session, partnerId),
    ]);

    return NextResponse.json({ partnerId, items, cars });
  } catch (error) {
    console.error("[partners/discounts GET]", error);
    return NextResponse.json({ error: "Could not load discounts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requirePartnerApi();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const partnerId = await resolvePartnerId(session.user.id, session.user.email);
    const body = await req.json();
    const cars = await listPartnerCars(session, partnerId);
    const owned = new Set(cars.map((c) => c.id));
    const carIds = (Array.isArray(body?.carIds) ? body.carIds : [])
      .map((id: unknown) => String(id || "").trim())
      .filter((id: string) => owned.has(id));

    const kind: PartnerPeriodDiscountKind = body?.kind === "markup" ? "markup" : "discount";

    try {
      const item = await createPeriodDiscount({
        partnerId,
        title: String(body?.title || ""),
        percent: Number(body?.percent),
        kind,
        from: String(body?.from || ""),
        to: String(body?.to || ""),
        carIds,
      });
      return NextResponse.json({ ok: true, item });
    } catch {
      return NextResponse.json(
        { error: "Invalid discount. Check name, percent, dates, and selected cars." },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("[partners/discounts POST]", error);
    return NextResponse.json({ error: "Could not create discount" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requirePartnerApi();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const partnerId = await resolvePartnerId(session.user.id, session.user.email);
    const body = await req.json();
    const id = String(body?.id || "").trim();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const cars = await listPartnerCars(session, partnerId);
    const owned = new Set(cars.map((c) => c.id));
    const carIds = Array.isArray(body?.carIds)
      ? body.carIds.map((x: unknown) => String(x || "").trim()).filter((x: string) => owned.has(x))
      : undefined;

    try {
      const item = await updatePeriodDiscount(id, partnerId, {
        title: body?.title != null ? String(body.title) : undefined,
        percent: body?.percent != null ? Number(body.percent) : undefined,
        kind: body?.kind === "markup" ? "markup" : body?.kind === "discount" ? "discount" : undefined,
        from: body?.from != null ? String(body.from) : undefined,
        to: body?.to != null ? String(body.to) : undefined,
        carIds,
      });
      if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true, item });
    } catch {
      return NextResponse.json({ error: "Invalid discount" }, { status: 400 });
    }
  } catch (error) {
    console.error("[partners/discounts PUT]", error);
    return NextResponse.json({ error: "Could not update discount" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requirePartnerApi();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const partnerId = await resolvePartnerId(session.user.id, session.user.email);
    const url = new URL(req.url);
    const id = String(url.searchParams.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const ok = await deletePeriodDiscount(id, partnerId);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[partners/discounts DELETE]", error);
    return NextResponse.json({ error: "Could not delete discount" }, { status: 500 });
  }
}
