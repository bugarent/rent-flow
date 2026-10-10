import { apiError, apiOk, authenticatePartnerApi } from "@/lib/server/partner-api-auth";
import { listPartnerOwnedCars } from "@/lib/server/partner-owned-cars";
import { ApiInputError, createDraftVehicle, serializeVehicle } from "@/lib/server/partner-api-v1";

export async function GET(req: Request) {
  const auth = await authenticatePartnerApi(req);
  if ("response" in auth) return auth.response;
  const cars = await listPartnerOwnedCars(auth.owner);
  return apiOk({ data: cars.map(serializeVehicle) });
}

export async function POST(req: Request) {
  const auth = await authenticatePartnerApi(req);
  if ("response" in auth) return auth.response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return apiError(400, "invalid_json", "Body must be a JSON object.");
  try {
    const existing = await listPartnerOwnedCars(auth.owner);
    const car = await createDraftVehicle(auth.owner, body, existing);
    return apiOk({ data: serializeVehicle(car) }, 201);
  } catch (error) {
    if (error instanceof ApiInputError) return apiError(error.status, error.code, error.message);
    console.error("[api/v1 vehicles POST]", error);
    return apiError(500, "server_error", "Could not create the vehicle.");
  }
}
