import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { NextResponse } from "next/server";
import { uploadRoot } from "@/lib/persistent-paths";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

/**
 * Serves uploads when they live outside `public/` (Cloudways persistent disk).
 * Files already in `public/uploads` are served by Next before this route.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await context.params;
  const rel = normalize(parts.join("/")).replace(/^(\.\.(\/|\\|$))+/, "");
  if (!rel || rel.startsWith("..") || rel.includes(`..${sep}`)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const root = resolve(uploadRoot());
  const file = resolve(join(root, rel));
  if (file !== root && !file.startsWith(root + sep)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const type = TYPES[extname(file).toLowerCase()];
  if (!type) return new NextResponse("Not found", { status: 404 });
  try {
    const info = await stat(file);
    if (!info.isFile()) return new NextResponse("Not found", { status: 404 });
    const body = await readFile(file);
    return new NextResponse(body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
