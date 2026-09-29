import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidBusinessPartnerPassword } from "@/lib/business-partner/password";
import { changeBusinessPartnerPassword } from "@/lib/server/business-partners-store";
import { getBusinessPartnerSession } from "@/lib/server/business-partner-session";

const schema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(6).max(128),
  })
  .refine((d) => isValidBusinessPartnerPassword(d.newPassword), {
    message: "Weak password",
    path: ["newPassword"],
  });

/** Change own cabinet login password. */
export async function POST(req: Request) {
  const sessionPartner = await getBusinessPartnerSession();
  if (!sessionPartner) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const body = schema.parse(await req.json());
    await changeBusinessPartnerPassword(
      sessionPartner.id,
      body.currentPassword,
      body.newPassword,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Weak password", code: "WEAK_PASSWORD" },
        { status: 400 },
      );
    }
    if (error instanceof Error) {
      if (error.message === "INVALID_PASSWORD") {
        return NextResponse.json(
          { error: "Current password is incorrect", code: "INVALID_PASSWORD" },
          { status: 400 },
        );
      }
      if (error.message === "WEAK_PASSWORD") {
        return NextResponse.json(
          { error: "Weak password", code: "WEAK_PASSWORD" },
          { status: 400 },
        );
      }
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }
    console.error("[business-partners password POST]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
