import "server-only";

import { randomBytes } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
};

function env(name: string): string {
  return (process.env[name] || "").trim();
}

/** True when CLOUDINARY_* credentials are present in the environment. */
export function isCloudinaryConfigured(): boolean {
  return Boolean(env("CLOUDINARY_CLOUD_NAME") && env("CLOUDINARY_API_KEY") && env("CLOUDINARY_API_SECRET"));
}

function configureCloudinary() {
  const cloud_name = env("CLOUDINARY_CLOUD_NAME");
  const api_key = env("CLOUDINARY_API_KEY");
  const api_secret = env("CLOUDINARY_API_SECRET");
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Cloudinary is not configured");
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

/**
 * Upload image bytes to Cloudinary. Returns only the HTTPS secure URL to store in Postgres —
 * binary data stays on Cloudinary, not in HostedFile / Neon.
 * Store the original secure_url; apply f_auto/q_auto/w_* at display time via
 * `displayImageUrl` / `optimizeCloudinaryUrl` in `@/lib/media/display-image`.
 */
export async function uploadImageToCloudinary(opts: {
  bytes: Buffer;
  /** Cloudinary folder, e.g. partner-cars */
  folder?: string;
  /** Stable id without folder prefix (extension stripped by Cloudinary). */
  publicId?: string;
  overwrite?: boolean;
}): Promise<CloudinaryUploadResult> {
  configureCloudinary();
  const folder = (opts.folder || "partner-cars").replace(/^\/+|\/+$/g, "");
  const publicId =
    opts.publicId?.replace(/\.[a-z0-9]+$/i, "") ||
    `${Date.now()}-${randomBytes(6).toString("hex")}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "image",
        overwrite: opts.overwrite === true,
        unique_filename: !opts.publicId,
        use_filename: Boolean(opts.publicId),
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error instanceof Error ? error : new Error("Cloudinary upload failed"));
          return;
        }
        resolve({ secureUrl: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(opts.bytes);
  });
}

/** Return an existing Cloudinary asset URL, or null if it is missing. */
export async function findCloudinaryImageUrl(folder: string, publicId: string): Promise<string | null> {
  if (!isCloudinaryConfigured()) return null;
  configureCloudinary();
  const id = `${folder.replace(/^\/+|\/+$/g, "")}/${publicId.replace(/\.[a-z0-9]+$/i, "")}`;
  try {
    const resource = await cloudinary.api.resource(id, { resource_type: "image" });
    return typeof resource?.secure_url === "string" ? resource.secure_url : null;
  } catch {
    return null;
  }
}
