import "server-only";

import { prisma } from "@/lib/prisma";
import { dbOfflineMessage, isDbOfflineError, shortPrismaError } from "@/lib/server/db-errors";
import { worldCountryName } from "@/lib/catalog/world-countries";
import { parsePartnerMessengers } from "@/lib/partner";
import { displayInternationalPhone } from "@/lib/catalog/dial-codes";
import { listLocalCustomers } from "@/lib/auth/local-customer-store";
import { isCustomerContactBanned } from "@/lib/server/customer-bans-store";
import type { AdminCustomerRow } from "@/lib/admin/customer-row";

export type { AdminCustomerRow };

export async function loadAdminCustomerRows(): Promise<{
  users: AdminCustomerRow[];
  dbOffline: boolean;
  queryError: string;
}> {
  let users: AdminCustomerRow[] = [];
  let dbOffline = false;
  let queryError = "";

  try {
    const rows = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: [{ customerNumber: "desc" }, { createdAt: "desc" }],
    });

    users = rows.map((u) => {
      const messengers = parsePartnerMessengers(
        (u as { messengers?: unknown }).messengers,
        u.preferredMessenger,
      );
      return {
        id: u.id,
        customerNumber: u.customerNumber,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: displayInternationalPhone(u.phone),
        countryOfResidence: u.countryOfResidence,
        countryLabel: worldCountryName(u.countryOfResidence) || u.countryOfResidence,
        messengers: messengers.length ? messengers : [u.preferredMessenger],
        status: u.status,
        source: "db" as const,
        banned: false,
      };
    });
  } catch (error) {
    console.error("[admin/users]", error);
    dbOffline = isDbOfflineError(error);
    queryError = dbOffline ? dbOfflineMessage("User") : shortPrismaError(error);
  }

  const localRows = listLocalCustomers().map((u) => ({
    id: u.id,
    customerNumber: u.customerNumber,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: displayInternationalPhone(u.phone),
    countryOfResidence: u.countryOfResidence,
    countryLabel: worldCountryName(u.countryOfResidence) || u.countryOfResidence,
    messengers: u.messengers.length ? u.messengers : [u.preferredMessenger],
    status: u.status,
    source: "local" as const,
    banned: false,
  }));

  const seenEmails = new Set(users.map((u) => u.email.toLowerCase()));
  for (const row of localRows) {
    if (!seenEmails.has(row.email.toLowerCase())) {
      users.push(row);
    }
  }

  users = await Promise.all(
    users.map(async (u) => {
      const ban = await isCustomerContactBanned({ email: u.email, phone: u.phone });
      const banned = Boolean(ban) || u.status === "SUSPENDED";
      return { ...u, banned, status: banned && u.status !== "SUSPENDED" ? u.status : u.status };
    }),
  );

  users.sort((a, b) => (b.customerNumber ?? 0) - (a.customerNumber ?? 0));
  return { users, dbOffline, queryError };
}
