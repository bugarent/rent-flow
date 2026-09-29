-- Country -> City -> Airport hierarchy already exists.
-- Add airport operating hours (local wall clock) and FX sync timestamp.

ALTER TABLE "Airport"
  ADD COLUMN IF NOT EXISTS "operatingOpenLocal" TEXT NOT NULL DEFAULT '00:00',
  ADD COLUMN IF NOT EXISTS "operatingCloseLocal" TEXT NOT NULL DEFAULT '23:59',
  ADD COLUMN IF NOT EXISTS "overnightAllowed" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "PlatformSetting"
  ADD COLUMN IF NOT EXISTS "fxRatesUpdatedAt" TIMESTAMP(3);

COMMENT ON COLUMN "Airport"."timezone" IS 'IANA timezone; Booking.pickupAt/dropoffAt stored as UTC';
COMMENT ON COLUMN "Airport"."operatingOpenLocal" IS 'Local HH:mm open for pickup/return';
COMMENT ON COLUMN "Airport"."operatingCloseLocal" IS 'Local HH:mm close for pickup/return';
