import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CONTACT_ATTACHMENT_MAX_BYTES,
  CONTACT_ATTACHMENT_TYPES,
  CONTACT_REQUEST_TYPES,
  type ContactRequestSubtypeId,
  type ContactRequestTypeId,
} from "@/lib/catalog/contact-message";
import { resolveContactInboxEmail } from "@/lib/catalog/footer-contact";
import { sendContactMessageEmail } from "@/lib/mail";
import { getFooterContactConfig } from "@/lib/server/footer-contact-store";
import { notifyAdminTelegram } from "@/lib/telegram/notify-admin";

const typeIds = CONTACT_REQUEST_TYPES.map((t) => t.id) as [ContactRequestTypeId, ...ContactRequestTypeId[]];
const subtypeIds = CONTACT_REQUEST_TYPES.flatMap((t) => t.subtypes) as [
  ContactRequestSubtypeId,
  ...ContactRequestSubtypeId[],
];

const schema = z.object({
  email: z.string().trim().email().max(160),
  requestType: z.enum(typeIds),
  subtype: z.enum(subtypeIds),
  bookingNumber: z.string().trim().max(80),
  subject: z.string().trim().min(2).max(200),
  description: z.string().trim().min(10).max(8000),
  attachmentName: z.string().trim().max(180).optional(),
  attachmentType: z.string().trim().max(120).optional(),
  attachmentBase64: z.string().max(7_500_000).optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const typeDef = CONTACT_REQUEST_TYPES.find((t) => t.id === body.requestType);
    if (!typeDef || !typeDef.subtypes.includes(body.subtype)) {
      return NextResponse.json({ error: "Invalid request type / subtype" }, { status: 400 });
    }

    const config = await getFooterContactConfig();
    const inbox = resolveContactInboxEmail(config);
    if (!inbox) {
      return NextResponse.json(
        { error: "Contact inbox is not configured. Set it in admin footer contact." },
        { status: 503 },
      );
    }

    let attachment: { filename: string; content: Buffer; contentType?: string } | undefined;
    if (body.attachmentBase64 && body.attachmentName) {
      const buf = Buffer.from(body.attachmentBase64, "base64");
      if (buf.byteLength > CONTACT_ATTACHMENT_MAX_BYTES) {
        return NextResponse.json({ error: "Attachment too large (max 5 MB)" }, { status: 400 });
      }
      const contentType = body.attachmentType || "application/octet-stream";
      if (
        !(CONTACT_ATTACHMENT_TYPES as readonly string[]).includes(contentType) &&
        !contentType.startsWith("image/")
      ) {
        return NextResponse.json({ error: "Attachment type not allowed" }, { status: 400 });
      }
      attachment = {
        filename: body.attachmentName.slice(0, 180),
        content: buf,
        contentType,
      };
    }

    const result = await sendContactMessageEmail({
      to: inbox,
      fromEmail: body.email,
      requestType: body.requestType,
      subtype: body.subtype,
      bookingNumber: body.bookingNumber,
      subject: body.subject,
      description: body.description,
      attachment,
    });

    const telegramText = [
      "📩 Contact form message",
      `From: ${body.email}`,
      `Type: ${body.requestType} / ${body.subtype}`,
      body.bookingNumber ? `Booking: ${body.bookingNumber}` : null,
      `Subject: ${body.subject}`,
      "",
      body.description.slice(0, 3000),
      attachment ? `\nAttachment: ${attachment.filename}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    void notifyAdminTelegram(telegramText).catch((err) =>
      console.warn("[contact/message] telegram notify failed", err),
    );

    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid message" }, { status: 400 });
    }
    console.error("[contact/message POST]", error);
    return NextResponse.json({ error: "Could not send message" }, { status: 500 });
  }
}
