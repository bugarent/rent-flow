import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/sessions";
import { clampFocal, normalizeCoverIso } from "@/lib/catalog/country-covers";
import { buildCountryCover } from "@/lib/server/country-cover-images";
import {
  getUploadedCountryCovers,
  markCountryCoverAutoAttempt,
  removeCountryCover,
  saveCountryCover,
} from "@/lib/server/country-covers-store";
import { findCountryCover } from "@/lib/server/country-cover-auto";
import { revalidatePublishedContent } from "@/lib/server/revalidate-public-content";

export const maxDuration = 60;

const unauthorized = () => NextResponse.json({ error: "Admin access required" }, { status: 403 });

export async function GET() {
  if (!(await requireAdminApi())) return unauthorized();
  return NextResponse.json({ uploaded: await getUploadedCountryCovers() });
}

/** multipart: `iso2`, `file`, optional `focalX` (0…1). */
export async function POST(req: Request) {
  if (!(await requireAdminApi())) return unauthorized();
  const form = await req.formData().catch(() => null);
  const iso = normalizeCoverIso(String(form?.get("iso2") || ""));
  const file = form?.get("file");
  if (!iso) return NextResponse.json({ error: "Invalid country" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });
  try {
    const cover = await buildCountryCover(file, iso, clampFocal(form?.get("focalX")));
    const uploaded = await saveCountryCover(iso, { ...cover, source: "admin" });
    revalidatePublishedContent();
    return NextResponse.json({ uploaded });
  } catch (error) {
    console.error("[admin/country-covers POST]", error);
    const message = error instanceof Error ? error.message : "Could not save";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** `?iso2=` — search Wikimedia Commons for this country's landmark now (admin button). */
export async function PUT(req: Request) {
  if (!(await requireAdminApi())) return unauthorized();
  const iso = normalizeCoverIso(new URL(req.url).searchParams.get("iso2"));
  if (!iso) return NextResponse.json({ error: "Invalid country" }, { status: 400 });
  try {
    const current = (await getUploadedCountryCovers())[iso];
    const found = await findCountryCover(iso, current?.credit?.url);
    await markCountryCoverAutoAttempt(iso, found);
    if (found) revalidatePublishedContent();
    return NextResponse.json({ found, uploaded: await getUploadedCountryCovers() });
  } catch (error) {
    console.error("[admin/country-covers PUT]", error);
    return NextResponse.json({ error: "Could not search" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await requireAdminApi())) return unauthorized();
  const iso = normalizeCoverIso(new URL(req.url).searchParams.get("iso2"));
  if (!iso) return NextResponse.json({ error: "Invalid country" }, { status: 400 });
  try {
    const uploaded = await removeCountryCover(iso);
    revalidatePublishedContent();
    return NextResponse.json({ uploaded });
  } catch (error) {
    console.error("[admin/country-covers DELETE]", error);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
}
