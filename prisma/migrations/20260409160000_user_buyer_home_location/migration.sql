-- Buyer welcome + saved home for listing distances
-- Idempotent: columns may already exist if the DB was synced with db push or partial apply.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "registrationIntent" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "homePostcode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "homeLat" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "homeLng" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "homeAdminDistrict" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "homeRegion" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "buyerWelcomeCompletedAt" TIMESTAMP(3);
