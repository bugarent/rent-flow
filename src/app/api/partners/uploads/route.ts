import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requirePartnerApi } from "@/lib/auth/sessions";
import { persistUploadedFile } from "@/lib/server/persist-upload";

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
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = ext === "pdf" ? "application/pdf" : ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    await persistUploadedFile(["partner-cars", filename], buffer, contentType);
    return NextResponse.json({ url: `/uploads/partner-cars/${filename}` });
  } catch (error) {
    console.error("[partners/uploads]", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json(
      { error: message === "Could not save the image" ? message : "Upload failed" },
      { status: 500 },
    );
  }
}
