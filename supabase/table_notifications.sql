-- ============================================================
-- Table Notifications — for Call Waiter / Ask for Bill
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create notification type enum
DO $$ BEGIN
  CREATE TYPE "TableNotificationType" AS ENUM ('CALL_WAITER', 'ASK_BILL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create TableNotification table
CREATE TABLE IF NOT EXISTS "TableNotification" (
  "id" TEXT PRIMARY KEY DEFAULT replace(gen_random_uuid()::text, '-', ''),
  "tableId" VARCHAR(20) NOT NULL REFERENCES "DiningTable"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "type" "TableNotificationType" NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "acknowledgedAt" TIMESTAMPTZ
);

-- 3. Indexes for efficient polling queries
CREATE INDEX IF NOT EXISTS "TableNotification_tableId_idx" ON "TableNotification"("tableId");
CREATE INDEX IF NOT EXISTS "TableNotification_status_idx" ON "TableNotification"("status");
CREATE INDEX IF NOT EXISTS "TableNotification_createdAt_idx" ON "TableNotification"("createdAt" DESC);

-- 4. Grant access
GRANT ALL ON "TableNotification" TO anon, authenticated;