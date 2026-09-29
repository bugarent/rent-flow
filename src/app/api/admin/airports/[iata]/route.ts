import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import { isValidIanaTimeZone, normalizeIanaTimeZone } from "@/lib/datetime/airport-timezone";
import { normalizeOperatingHours } from "@/lib/locations/operating-hours";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  timezone: z.string().min(3).max(64).optional(),
  operatingOpenLocal: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  operatingCloseLocal: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  overnightAllowed: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isHub: z.boolean().optional(),
});

/**
 * Admin: update airport timezone + operating hours (Country→City→Airport hierarchy).
 * Booking timestamps remain UTC; these fields drive local conversion and hours checks.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ iata: string }> },
) {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { iata: raw } = await ctx.params;
    const iata = String(raw || "").trim().toUpperCase();
    if (!iata) {
      return NextResponse.json({ error: "Missing IATA" }, { status: 400 });
    }
    const body = patchSchema.parse(await req.json());
    if (body.timezone && !isValidIanaTimeZone(body.timezone)) {
      return NextResponse.json({ error: "Invalid IANA timezone" }, { status: 400 });
    }
    const hours = normalizeOperatingHours({
      openLocal: body.operatingOpenLocal,
      closeLocal: body.operatingCloseLocal,
      overnightAllowed: body.overnightAllowed,
    });

    const airport = await prisma.airport.update({
      where: { iata },
      data: {
        ...(body.timezone ? { timezone: normalizeIanaTimeZone(body.timezone) } : {}),
        ...(body.operatingOpenLocal ? { operatingOpenLocal: hours.openLocal } : {}),
        ...(body.operatingCloseLocal ? { operatingCloseLocal: hours.closeLocal } : {}),
        ...(body.overnightAllowed !== undefined
          ? { overnightAllowed: body.overnightAllowed }
          : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.isHub !== undefined ? { isHub: body.isHub } : {}),
      },
      select: {
        id: true,
        iata: true,
        timezone: true,
        operatingOpenLocal: true,
        operatingCloseLocal: true,
        overnightAllowed: true,
        isActive: true,
        isHub: true,
        city: {
          select: {
            slug: true,
            country: { select: { iso2: true } },
          },
        },
      },
    });

    return NextResponse.json({
      airport: {
        iata: airport.iata,
        timezone: airport.timezone,
        operatingOpenLocal: airport.operatingOpenLocal,
        operatingCloseLocal: airport.operatingCloseLocal,
        overnightAllowed: airport.overnightAllowed,
        isActive: airport.isActive,
        isHub: airport.isHub,
        citySlug: airport.city.slug,
        countryIso2: airport.city.country.iso2,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    console.error("[admin airports PATCH]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ iata: string }> },
) {
  const session = await getAdminSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const { iata: raw } = await ctx.params;
  const iata = String(raw || "").trim().toUpperCase();
  try {
    const airport = await prisma.airport.findUnique({
      where: { iata },
      select: {
        iata: true,
        timezone: true,
        operatingOpenLocal: true,
        operatingCloseLocal: true,
        overnightAllowed: true,
        isActive: true,
        isHub: true,
        city: {
          select: {
            slug: true,
            name: true,
            country: { select: { iso2: true, name: true } },
          },
        },
      },
    });
    if (!airport) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ airport });
  } catch (error) {
    console.error("[admin airports GET]", error);
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }
}
