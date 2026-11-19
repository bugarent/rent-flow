/**
 * Apply BOG payment columns without prisma db push (which can propose dropping HostedFile).
 * Usage: node --env-file=.env scripts/apply-bog-payment-columns.mjs
 */
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });
const sql = [
  `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID'`,
  `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "bogOrderId" TEXT`,
  `CREATE INDEX IF NOT EXISTS "Booking_bogOrderId_idx" ON "Booking"("bogOrderId")`,
  `CREATE INDEX IF NOT EXISTS "Booking_paymentStatus_idx" ON "Booking"("paymentStatus")`,
];

try {
  for (const statement of sql) {
    await pool.query(statement);
    console.log("OK:", statement.slice(0, 72));
  }
} finally {
  await pool.end();
}
