import "server-only";
import { prisma } from "@/lib/prisma";
import { BOOKING_REF_START, PORTAL_ID_START } from "@/lib/ids";

export {
  PORTAL_ID_START,
  PARTNER_CODE_PREFIX,
  BOOKING_REF_PREFIX,
  BOOKING_REF_START,
  formatPartnerCode,
  formatCustomerId,
  formatBookingRef,
} from "@/lib/ids";

export type SequentialIdKey = "partner" | "customer" | "booking";

type SqlClient = {
  $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Array<{ value: number | bigint }>>;
  $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<number>;
  partner: {
    findMany: (args: object) => Promise<Array<{ id: string; sequentialNumber?: number | null }>>;
    findUnique: (args: object) => Promise<{ id: string; sequentialNumber: number | null } | null>;
    updateMany: (args: object) => Promise<unknown>;
    update: (args: object) => Promise<unknown>;
    aggregate: (args: object) => Promise<{ _max: { sequentialNumber: number | null } }>;
  };
  user: {
    findMany: (args: object) => Promise<Array<{ id: string }>>;
    update: (args: object) => Promise<unknown>;
    aggregate: (args: object) => Promise<{ _max: { customerNumber: number | null } }>;
  };
  booking: {
    aggregate: (args: object) => Promise<{ _max: { sequentialNumber: number | null } }>;
  };
};

const db = prisma as unknown as SqlClient;

const SEQUENCE_START: Record<SequentialIdKey, number> = {
  partner: PORTAL_ID_START,
  customer: PORTAL_ID_START,
  booking: BOOKING_REF_START,
};

async function nextSequentialValue(key: SequentialIdKey): Promise<number> {
  const start = SEQUENCE_START[key];
  const rows = await db.$queryRaw`
    INSERT INTO "IdSequence" ("key", "value")
    VALUES (${key}, ${start})
    ON CONFLICT ("key") DO UPDATE
    SET "value" = "IdSequence"."value" + 1
    RETURNING "value"
  `;
  const value = Number(rows[0]?.value);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Failed to allocate ${key} sequential ID`);
  }
  return value;
}

export async function nextPartnerSequentialNumber(): Promise<number> {
  return nextSequentialValue("partner");
}

export async function nextCustomerNumber(): Promise<number> {
  try {
    return await nextSequentialValue("customer");
  } catch (error) {
    console.error("[nextCustomerNumber] IdSequence failed, using aggregate fallback", error);
    const customerMax = await db.user.aggregate({
      where: { role: "CUSTOMER" },
      _max: { customerNumber: true },
    });
    const next = Math.max(PORTAL_ID_START, (customerMax._max.customerNumber ?? PORTAL_ID_START - 1) + 1);
    try {
      await setSequenceFloor("customer", next);
    } catch {
      /* sequence table may be missing — still return a unique-enough next value */
    }
    return next;
  }
}

export async function nextBookingSequentialNumber(): Promise<number> {
  try {
    return await nextSequentialValue("booking");
  } catch (error) {
    console.error("[nextBookingSequentialNumber] IdSequence failed, using aggregate fallback", error);
    const bookingMax = await db.booking.aggregate({ _max: { sequentialNumber: true } });
    const next = Math.max(
      BOOKING_REF_START,
      (bookingMax._max.sequentialNumber ?? BOOKING_REF_START - 1) + 1,
    );
    try {
      await setSequenceFloor("booking", next);
    } catch {
      /* ignore */
    }
    return next;
  }
}

/**
 * Read the next booking ref that would be issued — does NOT allocate / increment.
 * Safe to show before payment; the number stays free if checkout is abandoned.
 */
function withTimeout<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

async function peekBookingSequentialFromDb(): Promise<number> {
  try {
    const rows = await db.$queryRaw`
      SELECT "value" FROM "IdSequence" WHERE "key" = ${"booking"} LIMIT 1
    `;
    const current = Number(rows[0]?.value);
    if (Number.isFinite(current)) {
      return Math.max(BOOKING_REF_START, current + 1);
    }
  } catch {
    try {
      const bookingMax = await db.booking.aggregate({ _max: { sequentialNumber: true } });
      return Math.max(
        BOOKING_REF_START,
        (bookingMax._max.sequentialNumber ?? BOOKING_REF_START - 1) + 1,
      );
    } catch {
      return BOOKING_REF_START;
    }
  }
  return BOOKING_REF_START;
}

export async function peekNextBookingSequentialNumber(): Promise<number> {
  const fromDb = await withTimeout(peekBookingSequentialFromDb(), 400, BOOKING_REF_START);

  let fromFile = BOOKING_REF_START;
  try {
    const { peekNextFileBookingSequential } = await import(
      "@/lib/server/customer-bookings-store"
    );
    fromFile = await peekNextFileBookingSequential();
  } catch {
    /* ignore */
  }

  let fromChat = BOOKING_REF_START;
  try {
    const { peekNextChatBookingSequential } = await import(
      "@/lib/server/custom-booking-chat-store"
    );
    fromChat = await peekNextChatBookingSequential();
  } catch {
    /* ignore */
  }

  return Math.max(fromDb, fromFile, fromChat);
}

async function setSequenceFloor(key: SequentialIdKey, lastIssued: number) {
  const floor = Math.max(lastIssued, SEQUENCE_START[key] - 1);
  await db.$executeRaw`
    INSERT INTO "IdSequence" ("key", "value")
    VALUES (${key}, ${floor})
    ON CONFLICT ("key") DO UPDATE
    SET "value" = GREATEST("IdSequence"."value", ${floor})
  `;
}

/** Assign a unique PRT- code to one partner if missing / legacy (< 1000). */
export async function ensurePartnerSequentialNumber(partnerId: string): Promise<number | null> {
  try {
    const row = await db.partner.findUnique({
      where: { id: partnerId },
      select: { id: true, sequentialNumber: true },
    });
    if (!row) return null;
    if (row.sequentialNumber != null && row.sequentialNumber >= PORTAL_ID_START) {
      return row.sequentialNumber;
    }
    if (row.sequentialNumber != null) {
      await db.partner.update({
        where: { id: partnerId },
        data: { sequentialNumber: null },
      });
    }
    const sequentialNumber = await nextPartnerSequentialNumber();
    await db.partner.update({
      where: { id: partnerId },
      data: { sequentialNumber },
    });
    return sequentialNumber;
  } catch (error) {
    console.error("[ensurePartnerSequentialNumber]", error);
    return null;
  }
}

let backfillAttempted = false;

/** Assign missing IDs and remumber legacy values below 1000 so sequences stay independent. */
export async function backfillSequentialIds() {
  if (backfillAttempted) return;
  const approvedPartners = await db.partner.findMany({
    where: {
      OR: [{ sequentialNumber: null }, { sequentialNumber: { lt: PORTAL_ID_START } }],
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  if (approvedPartners.length) {
    await db.partner.updateMany({
      where: { id: { in: approvedPartners.map((p) => p.id) } },
      data: { sequentialNumber: null },
    });
    for (const partner of approvedPartners) {
      const sequentialNumber = await nextPartnerSequentialNumber();
      await db.partner.update({
        where: { id: partner.id },
        data: { sequentialNumber },
      });
    }
  }

  const partnerMax = await db.partner.aggregate({ _max: { sequentialNumber: true } });
  await setSequenceFloor("partner", partnerMax._max.sequentialNumber ?? PORTAL_ID_START - 1);

  const customers = await db.user.findMany({
    where: { role: "CUSTOMER", customerNumber: null },
    orderBy: [{ createdAt: "asc" }, { sequentialNumber: "asc" }],
    select: { id: true },
  });
  for (const customer of customers) {
    const customerNumber = await nextCustomerNumber();
    await db.user.update({
      where: { id: customer.id },
      data: { customerNumber },
    });
  }

  const customerMax = await db.user.aggregate({
    where: { role: "CUSTOMER" },
    _max: { customerNumber: true },
  });
  await setSequenceFloor("customer", customerMax._max.customerNumber ?? PORTAL_ID_START - 1);

  try {
    const bookingMax = await db.booking.aggregate({ _max: { sequentialNumber: true } });
    const bookingFloor = Math.max(
      BOOKING_REF_START - 1,
      bookingMax._max.sequentialNumber ?? BOOKING_REF_START - 1,
    );
    await setSequenceFloor("booking", bookingFloor);
  } catch {
    /* booking table / sequence may be unavailable offline */
  }
  backfillAttempted = true;
}
