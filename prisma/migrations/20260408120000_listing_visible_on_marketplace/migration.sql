-- AlterTable
-- Idempotent: column may already exist if the DB was synced with `db push` or an older deploy.
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "visibleOnMarketplace" BOOLEAN NOT NULL DEFAULT true;
