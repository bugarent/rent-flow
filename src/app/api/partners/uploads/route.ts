import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { persistUploadedFile } from "@/lib/server/persist-upload";
import { renderStudioCover, studioCoverIdentity } from "@/lib/server/studio-cover";

export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;

function fileExtension(file: File): string | null {
  const type = (file.type || "").toLowerCase();
  if (type === "image/png") return "png";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  if (type === "application/pdf" || type === "application/x-pdf") return "pdf";
  if (type === "image/jpeg") return "jpg";
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "png";
  if (name.endsWith(".gif")) return "gif";
  if (name.endsWith(".webp")) return "webp";
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpg";
  return null;
}

export async function POST(req: Request) {
  const session = await requirePartnerApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    const isCover = String(form.get("role") || "") === "cover";
    const ext = fileExtension(file);
    if (!ext) {
      return NextResponse.json({ error: "PNG, JPG, GIF, WEBP or PDF only" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });
    }
    if (isCover && (ext === "pdf" || ext === "gif")) {
      return NextResponse.json({ error: "cover_style" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    let saved: Buffer = buffer;
    let savedExt = ext;
    let contentType = ext === "pdf" ? "application/pdf" : ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    if (isCover) {
      const identity = studioCoverIdentity({
        make: String(form.get("make") || ""),
        model: String(form.get("model") || ""),
        year: String(form.get("year") || ""),
        color: String(form.get("color") || ""),
      });
      if (!identity) {
        return NextResponse.json({ error: "cover_identity" }, { status: 400 });
      }
      saved = await renderStudioCover({
        bytes: buffer,
        mime: contentType,
        ...identity,
      });
      savedExt = "png";
      contentType = "image/png";
    }
    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${savedExt}`;
    await persistUploadedFile(["partner-cars", filename], saved, contentType);
    return NextResponse.json({ url: `/uploads/partner-cars/${filename}` });
  } catch (error) {
    console.error("[partners/uploads]", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    if (message === "cover_identity" || message === "cover_style") {
      return NextResponse.json({ error: message }, { status: message === "cover_identity" ? 400 : 502 });
    }
    return NextResponse.json(
      { error: message === "Could not save the image" ? message : "Upload failed" },
      { status: 500 },
    );
  }
}
