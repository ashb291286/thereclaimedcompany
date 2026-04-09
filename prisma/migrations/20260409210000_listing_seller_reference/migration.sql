-- Optional yard/stock reference on marketplace listings
-- Idempotent: column may already exist if the DB was synced with db push.
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "sellerReference" TEXT;
