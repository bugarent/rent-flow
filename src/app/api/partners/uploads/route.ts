import { uploadDir } from "@/lib/persistent-paths";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { requirePartnerApi } from "@/lib/auth/sessions";

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
    const ext = fileExtension(file);
    if (!ext) {
      return NextResponse.json({ error: "PNG, JPG, GIF, WEBP or PDF only" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });
    }
    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    const dir = uploadDir("partner-cars");
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(dir, filename), buffer);
    return NextResponse.json({ url: `/uploads/partner-cars/${filename}` });
  } catch (error) {
    console.error("[partners/uploads]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
