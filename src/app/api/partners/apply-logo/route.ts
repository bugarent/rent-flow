import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { persistUploadedFile } from "@/lib/server/persist-upload";

const MAX_BYTES = 4 * 1024 * 1024;

function imageExtension(file: File): string | null {
  const type = (file.type || "").toLowerCase();
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "image/jpeg") return "jpg";
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "png";
  if (name.endsWith(".webp")) return "webp";
  if (name.endsWith(".gif")) return "gif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpg";
  return null;
}

/** Public logo upload for a partner application, before a cabinet exists. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    const ext = imageExtension(file);
    if (!ext) {
      return NextResponse.json({ error: "PNG, JPG, GIF or WEBP only" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 4 MB)" }, { status: 400 });
    }
    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    await persistUploadedFile(["partner-logos", filename], buffer, contentType);
    return NextResponse.json({ url: `/uploads/partner-logos/${filename}` });
  } catch (error) {
    console.error("[partners/apply-logo]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
