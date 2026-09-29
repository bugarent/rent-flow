import { NextResponse } from "next/server";
import { getMockAvailability } from "@/lib/integrations/sandbox/simulator";

export async function GET() {
  return NextResponse.json(getMockAvailability());
}
