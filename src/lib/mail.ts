import "server-only";

import type { NotificationEvent } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SITE_NAME } from "@/lib/brand";
import { PARTNER_REGISTER } from "@/lib/routes";

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  event:
    | "PARTNER_INVITE"
    | "PARTNER_FEEDBACK"
    | "PARTNER_APPROVED"
    | "OTP"
    | "BOOKING_NEW"
    | "BOOKING_EDITED"
    | "BOOKING_CANCELLED"
    | "CONTACT_MESSAGE"
    | "CUSTOMER_NOTICE";
  userId?: string | null;
  payload?: Record<string, unknown>;
  replyTo?: string;
  /** Mailbox shown as the sender. Falls back to SMTP_FROM. */
  from?: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
};

/**
 * Partner emails: always logged to NotificationLog when DB is up.
 * If SMTP_* env vars are set, also attempts a real send via optional nodemailer.
 */
export async function sendPartnerMail(input: SendMailInput): Promise<{ logged: true; sent: boolean }> {
  try {
    await prisma.notificationLog.create({
      data: {
        userId: input.userId ?? undefined,
        channel: "EMAIL",
        event: input.event as NotificationEvent,
        recipient: input.to,
        payload: {
          subject: input.subject,
          text: input.text,
          ...(input.payload ?? {}),
        },
      },
    });
  } catch (error) {
    console.warn(`[mail:${input.event}] notification log skipped`, error);
  }

  const { readBookingMailConfig } = await import("@/lib/server/booking-mail-from");
  const stored = await readBookingMailConfig().catch(() => null);
  const host = process.env.SMTP_HOST?.trim() || stored?.smtpHost || "";
  const user = process.env.SMTP_USER?.trim() || stored?.smtpUser || "";
  const pass = process.env.SMTP_PASS?.trim() || stored?.smtpPass || "";
  const port = Number(process.env.SMTP_PORT || stored?.smtpPort || 587);
  if (!host || !user || !pass) {
    console.info(`[mail:${input.event}] SMTP is not configured; to=${input.to} subject=${input.subject}`);
    return { logged: true, sent: false };
  }

  try {
    // Literal specifier so the deploy file-tracer bundles nodemailer with the server function.
    const nodemailer = (await import("nodemailer").catch((error: unknown) => {
      console.error(`[mail:${input.event}] nodemailer could not be loaded`, error);
      return null;
    })) as unknown as {
      createTransport?: (opts: unknown) => { sendMail: (opts: unknown) => Promise<unknown> };
      default?: {
        createTransport?: (opts: unknown) => { sendMail: (opts: unknown) => Promise<unknown> };
      };
    } | null;
    const createTransport = nodemailer?.createTransport || nodemailer?.default?.createTransport;
    if (!createTransport) {
      console.error(`[mail:${input.event}] SMTP configured but nodemailer is unavailable; email NOT sent to ${input.to}`);
      return { logged: true, sent: false };
    }
    const transporter = createTransport({
      host,
      port: Number.isInteger(port) && port > 0 ? port : 587,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: { user, pass },
    });
    const fromAddress = input.from?.trim() || process.env.SMTP_FROM || `${SITE_NAME} <noreply@${SITE_NAME}>`;
    await transporter.sendMail({
      from: fromAddress,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? `<pre style="font-family:sans-serif">${input.text}</pre>`,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      ...(input.attachments?.length ? { attachments: input.attachments } : {}),
    });
    return { logged: true, sent: true };
  } catch (error) {
    console.error(`[mail:${input.event}] SMTP send to ${input.to} via ${host}:${port} failed:`, error);
    return { logged: true, sent: false };
  }
}

export function buildPartnerInviteUrl(origin: string, token: string) {
  const base = origin.replace(/\/$/, "");
  return `${base}${PARTNER_REGISTER}?token=${encodeURIComponent(token)}`;
}

export async function sendPartnerInviteEmail(opts: {
  email: string;
  contactName: string;
  inviteUrl: string;
  userId?: string | null;
}) {
  const subject = `Complete your ${SITE_NAME} partner registration`;
  const text = [
    `Hello ${opts.contactName},`,
    "",
    `Your partner application on ${SITE_NAME} was approved for registration.`,
    "Open this unique link to create your account (valid for a limited time):",
    "",
    opts.inviteUrl,
    "",
    "If you did not apply, you can ignore this email.",
  ].join("\n");

  return sendPartnerMail({
    to: opts.email,
    subject,
    text,
    event: "PARTNER_INVITE",
    userId: opts.userId,
    payload: { inviteUrl: opts.inviteUrl },
  });
}

export async function sendContactMessageEmail(opts: {
  to: string;
  fromEmail: string;
  requestType: string;
  subtype: string;
  bookingNumber: string;
  subject: string;
  description: string;
  attachment?: { filename: string; content: Buffer; contentType?: string };
}) {
  const subject = `[Contact] ${opts.subject}`;
  const text = [
    `New contact form message on ${SITE_NAME}`,
    "",
    `From: ${opts.fromEmail}`,
    `Request type: ${opts.requestType}`,
    `Subtype: ${opts.subtype}`,
    `Booking number: ${opts.bookingNumber || "—"}`,
    `Subject: ${opts.subject}`,
    "",
    "Description:",
    opts.description,
  ].join("\n");

  return sendPartnerMail({
    to: opts.to,
    subject,
    text,
    html: `<div style="font-family:sans-serif;line-height:1.5">
      <p><strong>New contact form message</strong> on ${SITE_NAME}</p>
      <p><strong>From:</strong> ${escapeHtml(opts.fromEmail)}<br/>
      <strong>Request type:</strong> ${escapeHtml(opts.requestType)}<br/>
      <strong>Subtype:</strong> ${escapeHtml(opts.subtype)}<br/>
      <strong>Booking number:</strong> ${escapeHtml(opts.bookingNumber || "—")}<br/>
      <strong>Subject:</strong> ${escapeHtml(opts.subject)}</p>
      <hr/>
      <pre style="white-space:pre-wrap;font-family:sans-serif">${escapeHtml(opts.description)}</pre>
    </div>`,
    event: "CONTACT_MESSAGE",
    replyTo: opts.fromEmail,
    payload: {
      fromEmail: opts.fromEmail,
      requestType: opts.requestType,
      subtype: opts.subtype,
      bookingNumber: opts.bookingNumber,
    },
    attachments: opts.attachment ? [opts.attachment] : undefined,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendPartnerFeedbackEmail(opts: {
  email: string;
  contactName: string;
  note: string;
  correctionUrl: string;
  userId?: string | null;
}) {
  const subject = `Action required: update your ${SITE_NAME} partner registration`;
  const text = [
    `Hello ${opts.contactName},`,
    "",
    "An administrator reviewed your registration and needs corrections:",
    "",
    opts.note,
    "",
    "Please update your details here:",
    opts.correctionUrl,
    "",
  ].join("\n");

  return sendPartnerMail({
    to: opts.email,
    subject,
    text,
    event: "PARTNER_FEEDBACK",
    userId: opts.userId,
    payload: { note: opts.note, correctionUrl: opts.correctionUrl },
  });
}
