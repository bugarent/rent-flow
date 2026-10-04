import { NextResponse } from "next/server";
import { getMockFleet } from "@/lib/integrations/sandbox/simulator";

export async function GET() {
  return NextResponse.json(getMockFleet());
}
