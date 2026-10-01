-- Durable JSON overlay so admin/public/partner saves persist on serverless hosts.
CREATE TABLE IF NOT EXISTS "JsonStore" (
    "key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JsonStore_pkey" PRIMARY KEY ("key")
);
