-- Bank of Georgia online card payment fields on Booking
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "bogOrderId" TEXT;

CREATE INDEX IF NOT EXISTS "Booking_bogOrderId_idx" ON "Booking"("bogOrderId");
CREATE INDEX IF NOT EXISTS "Booking_paymentStatus_idx" ON "Booking"("paymentStatus");
