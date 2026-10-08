import { isDbOfflineError } from "@/lib/server/db-errors";

export type ListingUpdateFailure = {
  message: string;
  code: string;
  status: number;
};

function errorParts(error: unknown): { code: string; name: string; message: string; meta: Record<string, unknown> } {
  const err = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const meta = err.meta && typeof err.meta === "object" ? (err.meta as Record<string, unknown>) : {};
  return {
    code: typeof err.code === "string" ? err.code : "",
    name: error instanceof Error ? error.name : typeof err.name === "string" ? err.name : "",
    message: error instanceof Error ? error.message : typeof err.message === "string" ? err.message : "",
    meta,
  };
}

/** A short, safe reason a partner listing save did not complete. */
export function explainListingUpdateError(error: unknown): ListingUpdateFailure {
  if (isDbOfflineError(error)) {
    return { message: "Database unavailable", code: "DB_OFFLINE", status: 503 };
  }
  const { code, name, message, meta } = errorParts(error);
  const field = String(meta.field_name || meta.constraint || "");
  const target = Array.isArray(meta.target) ? meta.target.map(String).join(" ") : String(meta.target || "");
  const firstLine = message.split("\n").map((line) => line.trim()).find(Boolean) || "";

  if (code === "P2003") {
    if (/delivery/i.test(field + firstLine)) {
      return {
        message: "A selected delivery place is not stored in the database, so the listing was not saved.",
        code: "DELIVERY_FK",
        status: 400,
      };
    }
    if (/extra/i.test(field + firstLine)) {
      return {
        message: "An additional service is missing from the catalog, so the listing was not saved.",
        code: "EXTRA_FK",
        status: 400,
      };
    }
    return {
      message: "A linked record is missing, so the listing was not saved.",
      code: "FK",
      status: 400,
    };
  }
  if (code === "P2002") {
    if (/registration/i.test(target + field + firstLine)) {
      return { message: "Registration number is already used", code: "PLATE_TAKEN", status: 409 };
    }
    return {
      message: "A duplicate value blocked the save.",
      code: "DUPLICATE",
      status: 409,
    };
  }
  if (code === "P2025") {
    return { message: "This listing no longer exists.", code: "NOT_FOUND", status: 404 };
  }
  if (
    code === "P2007" ||
    name === "PrismaClientValidationError" ||
    /invalid value|unknown argument|got invalid/i.test(firstLine)
  ) {
    return {
      message: firstLine.slice(0, 240) || "One of the fields has an invalid value, so the listing was not saved.",
      code: "INVALID_FIELD",
      status: 400,
    };
  }
  return {
    message: firstLine.slice(0, 240) || "Failed to update listing",
    code: "LISTING_UPDATE_FAILED",
    status: 500,
  };
}
