import { apiError, apiOk, authenticatePartnerApi } from "@/lib/server/partner-api-auth";
import { findPartnerOwnedCar } from "@/lib/server/partner-owned-cars";
import { ApiInputError, applyRates, parseRates, serializeVehicle } from "@/lib/server/partner-api-v1";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const auth = await authenticatePartnerApi(req);
  if ("response" in auth) return auth.response;
  const car = await findPartnerOwnedCar(auth.owner, (await params).id);
  if (!car) return apiError(404, "vehicle_not_found", "No vehicle with this id or external_id.");
  return apiOk({ data: serializeVehicle(car) });
}

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await authenticatePartnerApi(req);
  if ("response" in auth) return auth.response;
  const car = await findPartnerOwnedCar(auth.owner, (await params).id);
  if (!car) return apiError(404, "vehicle_not_found", "No vehicle with this id or external_id.");
  const body = await req.json().catch(() => null);
  try {
    const updated = await applyRates(car, parseRates(body));
    return apiOk({ data: serializeVehicle(updated) });
  } catch (error) {
    if (error instanceof ApiInputError) return apiError(error.status, error.code, error.message);
    console.error("[api/v1 rates PUT]", error);
    return apiError(500, "server_error", "Could not save rates.");
  }
}
