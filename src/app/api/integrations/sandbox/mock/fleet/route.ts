import { NextResponse } from "next/server";
import {
  getMockAvailability,
  getMockFleet,
  mockLockBooking,
  mockUnlockBooking,
} from "@/lib/integrations/sandbox/simulator";
import { bookingLockSchema } from "@/lib/integrations/types";

export async function GET() {
  return NextResponse.json(getMockFleet());
}
