import { NextResponse } from "next/server";
import { getAdminSession, requirePartnerApi } from "@/lib/auth/sessions";
import { storePartnerUpload } from "@/lib/server/store-partner-upload";

export const maxDuration = 60;

function uploadErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Upload failed";
  const status =
    message === "file required" || message.includes("too large") || message.includes("only") ? 400 : 500;
  return NextResponse.json(
    {
      error:
        message === "file required" ||
        message.includes("too large") ||
        message.includes("only") ||
        message === "Could not save the image" ||
        message === "Cloudinary is not configured"
          ? message
          : "Upload failed",
    },
    { status },
  );
}

export async function POST(req: Request) {
  const partner = await requirePartnerApi();
  const admin = partner ? null : await getAdminSession();
  if (!partner && admin?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    const kind = String(form.get("kind") || "");
    const stored = await storePartnerUpload(file, kind);
    return NextResponse.json({ url: stored.url, styled: false });
  } catch (error) {
    console.error("[partners/uploads]", error);
    return uploadErrorResponse(error);
  }
}
