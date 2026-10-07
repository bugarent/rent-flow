import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { ensureCatalogStudioCover } from "@/lib/server/catalog-studio-cover";
import { ensureStudioCoverFromPhoto } from "@/lib/server/photo-studio-cover";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await requirePartnerApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { make?: unknown; model?: unknown; year?: unknown; color?: unknown; photoUrl?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "cover_identity" }, { status: 400 });
  }
  const identity = {
    make: String(body.make || ""),
    model: String(body.model || ""),
    year: String(body.year || ""),
    color: String(body.color || ""),
  };
  try {
    const photoUrl = String(body.photoUrl || "").trim();
    const url = photoUrl
      ? await ensureStudioCoverFromPhoto(photoUrl, identity)
      : await ensureCatalogStudioCover(identity);
    return NextResponse.json({ url, styled: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "cover_style";
    console.error("[studio-cover]", message);
    const status = message === "cover_identity" || message === "cover_source" ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
