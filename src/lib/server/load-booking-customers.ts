import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeLogin } from "@/lib/crypto";
import { displayInternationalPhone } from "@/lib/catalog/dial-codes";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { parsePartnerMessengers } from "@/lib/partner";
import { findLocalCustomerByEmail, findLocalCustomerById } from "@/lib/auth/local-customer-store";
import { listCustomerBans } from "@/lib/server/customer-bans-store";
import { listAllFileBookings } from "@/lib/server/customer-bookings-store";
import { isDbOfflineError, shortPrismaError } from "@/lib/server/db-errors";
import type { BookingCustomerBooking, BookingCustomerRow } from "@/lib/admin/booking-customer-row";

export type { BookingCustomerRow };

const BOOKINGS_ON_ROW = 8;

type AccountSnap = {
  id: string;
  customerNumber: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryOfResidence: string;
  messengers: unknown;
  preferredMessenger: string | null;
  status: string;
};

type Hit = {
  at: string;
  bookingId: string;
  customerId: string;
  account: AccountSnap | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryIso: string;
  messengers: string[];
  booking: BookingCustomerBooking;
};

type Draft = {
  key: string;
  userId: string | null;
  customerNumber: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryIso: string;
  messengers: string[];
  status: string;
  bookingCount: number;
  bookings: BookingCustomerBooking[];
  latestAt: string;
};

function phoneDigits(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

function groupKey(email: string, phone: string, bookingId: string) {
  const mail = normalizeLogin(email);
  if (mail.includes("@")) return `email:${mail}`;
  const digits = phoneDigits(phone);
  if (digits.length >= 6) return `phone:${digits}`;
  return `booking:${bookingId}`;
}

function fill(draft: Draft, hit: Hit) {
  const account = hit.account;
  const email = normalizeLogin(account?.email || hit.email);
  if (!draft.email && email) draft.email = email;
  if (!draft.firstName) draft.firstName = (hit.firstName || account?.firstName || "").trim();
  if (!draft.lastName) draft.lastName = (hit.lastName || account?.lastName || "").trim();
  if (!draft.phone) draft.phone = (hit.phone || account?.phone || "").trim();
  if (!draft.countryIso) draft.countryIso = (hit.countryIso || account?.countryOfResidence || "").trim();
  if (!draft.messengers.length) {
    const fromUser = account
      ? parsePartnerMessengers(account.messengers, account.preferredMessenger)
      : [];
    draft.messengers = hit.messengers.length ? hit.messengers : fromUser;
  }
  if (account && !draft.userId) {
    draft.userId = account.id;
    draft.customerNumber = account.customerNumber;
    draft.status = account.status || "ACTIVE";
  } else if (!draft.userId && hit.customerId && hit.customerId !== "guest") {
    draft.userId = hit.customerId;
  }
}

function applyLocal(
  draft: Draft,
  local: {
    id: string;
    customerNumber: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    countryOfResidence: string;
    messengers: string[];
    preferredMessenger: string;
    status: string;
  },
) {
  draft.userId = local.id;
  draft.customerNumber = local.customerNumber;
  draft.status = local.status || draft.status;
  if (!draft.firstName) draft.firstName = local.firstName;
  if (!draft.lastName) draft.lastName = local.lastName;
  if (!draft.email) draft.email = normalizeLogin(local.email);
  if (!draft.phone) draft.phone = local.phone;
  if (!draft.countryIso) draft.countryIso = local.countryOfResidence;
  if (!draft.messengers.length) {
    draft.messengers = local.messengers.length ? local.messengers : [local.preferredMessenger];
  }
}

export async function loadBookingCustomers(): Promise<{
  customers: BookingCustomerRow[];
  dbOffline: boolean;
  queryError: string;
}> {
  const hits: Hit[] = [];
  let dbOffline = false;
  let queryError = "";

  try {
    const rows = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sequentialNumber: true,
        customerId: true,
        pickupAt: true,
        dropoffAt: true,
        status: true,
        createdAt: true,
        guestFirstName: true,
        guestLastName: true,
        guestPhone: true,
        guestEmail: true,
        guestMessenger: true,
        customer: {
          select: {
            id: true,
            customerNumber: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            countryOfResidence: true,
            messengers: true,
            preferredMessenger: true,
            status: true,
          },
        },
      },
    });
    for (const row of rows) {
      hits.push({
        at: row.createdAt.toISOString(),
        bookingId: row.id,
        customerId: row.customerId,
        account: row.customer,
        firstName: row.guestFirstName,
        lastName: row.guestLastName,
        email: row.guestEmail || row.customer.email,
        phone: row.guestPhone || row.customer.phone,
        countryIso: row.customer.countryOfResidence || "",
        messengers: parsePartnerMessengers(null, row.guestMessenger),
        booking: {
          id: row.id,
          code: String(row.sequentialNumber),
          pickupAt: row.pickupAt.toISOString(),
          dropoffAt: row.dropoffAt.toISOString(),
          status: row.status,
        },
      });
    }
  } catch (error) {
    console.error("[admin/booking-customers]", error);
    dbOffline = isDbOfflineError(error);
    if (!dbOffline) queryError = shortPrismaError(error);
  }

  try {
    const fileRows = await listAllFileBookings();
    for (const row of fileRows) {
      const messengers = (row.guestMessengers?.length ? row.guestMessengers : [row.guestMessenger]).filter(Boolean);
      hits.push({
        at: row.createdAt,
        bookingId: row.id,
        customerId: row.customerId,
        account: null,
        firstName: row.guestFirstName,
        lastName: row.guestLastName,
        email: row.guestEmail,
        phone: row.guestPhone,
        countryIso: row.countryOfResidence || "",
        messengers,
        booking: {
          id: row.id,
          code: String(row.sequentialNumber),
          pickupAt: row.pickupAt,
          dropoffAt: row.dropoffAt,
          status: row.status,
        },
      });
    }
  } catch (error) {
    console.error("[admin/booking-customers file]", error);
    if (!queryError) queryError = "Could not read saved bookings";
  }

  hits.sort((a, b) => b.at.localeCompare(a.at));

  const groups = new Map<string, Draft>();
  const seenBookingIds = new Set<string>();
  for (const hit of hits) {
    if (seenBookingIds.has(hit.bookingId)) continue;
    seenBookingIds.add(hit.bookingId);
    const email = normalizeLogin(hit.account?.email || hit.email);
    const phone = hit.phone || hit.account?.phone || "";
    const key = groupKey(email, phone, hit.bookingId);
    let draft = groups.get(key);
    if (!draft) {
      draft = {
        key,
        userId: null,
        customerNumber: null,
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        countryIso: "",
        messengers: [],
        status: "ACTIVE",
        bookingCount: 0,
        bookings: [],
        latestAt: hit.at,
      };
      groups.set(key, draft);
    }
    draft.bookingCount += 1;
    if (hit.at > draft.latestAt) draft.latestAt = hit.at;
    if (draft.bookings.length < BOOKINGS_ON_ROW) draft.bookings.push(hit.booking);
    fill(draft, hit);
  }

  for (const draft of groups.values()) {
    if (!draft.userId && draft.email) {
      const local = findLocalCustomerByEmail(draft.email);
      if (local) applyLocal(draft, local);
    } else if (draft.userId && draft.customerNumber == null) {
      const local = findLocalCustomerById(draft.userId);
      if (local) applyLocal(draft, local);
    }
  }

  const bans = await listCustomerBans();
  const customers: BookingCustomerRow[] = [...groups.values()]
    .sort((a, b) => b.latestAt.localeCompare(a.latestAt))
    .map((draft) => {
      const mail = normalizeLogin(draft.email);
      const digits = phoneDigits(draft.phone);
      const banned =
        draft.status === "SUSPENDED" ||
        bans.some(
          (ban) =>
            (mail && ban.email === mail) || (digits.length >= 8 && ban.phoneDigits === digits),
        );
      const iso = draft.countryIso.trim();
      const name = `${draft.firstName} ${draft.lastName}`.trim();
      return {
        id: draft.key,
        userId: draft.userId,
        customerNumber: draft.customerNumber,
        displayName: name || draft.email || "—",
        email: draft.email,
        phone: displayInternationalPhone(draft.phone),
        countryLabel: iso ? worldCountryName(iso) || iso : "—",
        messengers: draft.messengers,
        status: banned ? "SUSPENDED" : draft.status || "ACTIVE",
        banned,
        hasAccount: Boolean(draft.userId),
        bookingCount: draft.bookingCount,
        bookings: draft.bookings,
      };
    });

  return { customers, dbOffline, queryError };
}
