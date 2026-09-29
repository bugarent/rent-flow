import type {
  AvailabilityPayload,
  BookingLockRequest,
  BookingLockResponse,
  FleetPayload,
} from "@/lib/integrations/types";

type MockState = {
  fleet: FleetPayload;
  availability: AvailabilityPayload;
  locks: Array<BookingLockRequest & { externalBookingId: string; at: string }>;
};

const globalKey = "__rac_integration_sandbox__";

function state(): MockState {
  const g = globalThis as unknown as Record<string, MockState | undefined>;
  if (!g[globalKey]) {
    g[globalKey] = {
      fleet: { vehicles: [] },
      availability: { availability: [] },
      locks: [],
    };
  }
  return g[globalKey]!;
}

export function seedMockPartnerFleet(count = 3): FleetPayload {
  const s = state();
  const vehicles = Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      externalId: `MOCK-VEH-${n}`,
      make: n % 2 === 0 ? "Toyota" : "Hyundai",
      model: n % 2 === 0 ? "Corolla" : "Tucson",
      year: 2022 + (n % 3),
      category: n % 2 === 0 ? "economy" : "suv",
      photos: [`https://placehold.co/640x400?text=Mock+${n}`],
      dailyRate: 35 + n * 5,
      currency: "EUR",
      active: true,
    };
  });
  s.fleet = { vehicles };
  const from = new Date();
  from.setUTCDate(from.getUTCDate() + 14);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 2);
  s.availability = {
    availability: vehicles.map((v) => ({
      externalId: v.externalId,
      blocks: [
        {
          from: from.toISOString(),
          to: to.toISOString(),
        },
      ],
    })),
  };
  s.locks = [];
  return s.fleet;
}

export function getMockFleet(): FleetPayload {
  const s = state();
  if (!s.fleet.vehicles.length) seedMockPartnerFleet();
  return s.fleet;
}

export function getMockAvailability(): AvailabilityPayload {
  const s = state();
  if (!s.availability.availability.length) seedMockPartnerFleet();
  return s.availability;
}

export function mockLockBooking(body: BookingLockRequest): BookingLockResponse {
  const s = state();
  const clash = s.locks.find(
    (l) =>
      l.externalId === body.externalId &&
      !(new Date(body.dropoffAt) <= new Date(l.pickupAt) || new Date(body.pickupAt) >= new Date(l.dropoffAt)),
  );
  if (clash) {
    return { ok: false, message: "Dates already locked in mock partner" };
  }
  const externalBookingId = `MOCK-BK-${Date.now()}`;
  s.locks.push({ ...body, externalBookingId, at: new Date().toISOString() });
  return { ok: true, externalBookingId };
}

export function mockUnlockBooking(lockId: string): BookingLockResponse {
  const s = state();
  const before = s.locks.length;
  s.locks = s.locks.filter((l) => l.lockId !== lockId);
  return { ok: s.locks.length < before, message: s.locks.length < before ? "Unlocked" : "Lock not found" };
}

export function getMockLocks() {
  return state().locks;
}

export function resetMockPartner() {
  const s = state();
  s.fleet = { vehicles: [] };
  s.availability = { availability: [] };
  s.locks = [];
}
