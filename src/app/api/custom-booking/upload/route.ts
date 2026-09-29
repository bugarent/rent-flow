import { uploadDir } from "@/lib/persistent-paths";
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { getAdminSession } from "@/lib/auth/sessions";
import { getCustomBookingChatByCode } from "@/lib/server/custom-booking-chat-store";
import { parseCustomBookingCode } from "@/lib/catalog/custom-booking-chat";

const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    const admin = await getAdminSession();
    const isAdmin = Boolean(admin && admin.user.role === "ADMIN");

    if (!isAdmin) {
      const codeRaw = String(form.get("code") || "");
      const email = String(form.get("email") || "")
        .toLowerCase()
        .trim();
      const code = parseCustomBookingCode(codeRaw);
      if (!code || !email) {
        return NextResponse.json({ error: "Tracking code and email are required" }, { status: 400 });
      }
      const chat = await getCustomBookingChatByCode(code);
      if (!chat || chat.email !== email) {
        return NextResponse.json({ error: "Invalid chat credentials" }, { status: 403 });
      }
    }

    const ext = extname(file.name).toLowerCase() || ".jpg";
    if (!ALLOWED.has(ext)) {
      return NextResponse.json({ error: "Use a JPG, PNG, WebP, or GIF image" }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 8MB" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const dir = uploadDir("custom-booking");
    await mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    await writeFile(join(dir, filename), bytes);
    return NextResponse.json({ url: `/uploads/custom-booking/${filename}` });
  } catch (error) {
    console.error("[custom-booking/upload]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
