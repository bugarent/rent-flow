import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth/sessions";
import { setTplPartnerChoiceCountry } from "@/lib/server/tpl-partner-choice-store";

const bodySchema = z.object({
  iso2: z.string().trim().length(2),
  on: z.boolean(),
});

export async function PATCH(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const body = bodySchema.parse(await req.json());
    const iso2s = await setTplPartnerChoiceCountry(body.iso2, body.on);
    return NextResponse.json({ iso2s });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid country" }, { status: 400 });
    }
    console.error("[admin/extras/tpl-choice]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update TPL countries" },
      { status: 500 },
    );
  }
}
