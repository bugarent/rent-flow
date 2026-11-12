import { NextResponse } from "next/server";
import { getPublicFooterContact } from "@/lib/server/footer-contact-store";

/** Public phone, email, and address for the footer bar. Inbox address stays private. */
export async function GET() {
  try {
    const contact = await getPublicFooterContact();
    return NextResponse.json(
      {
        phone: contact.phone,
        email: contact.email,
        address: contact.address,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[footer-contact GET]", error);
    return NextResponse.json({ error: "Could not load footer contact" }, { status: 500 });
  }
}
