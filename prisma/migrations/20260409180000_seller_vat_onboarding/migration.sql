-- Reclamation yard VAT flag (prices ex VAT when true; +20% for buyers)
-- Idempotent: column may already exist if the DB was synced with db push.
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "vatRegistered" BOOLEAN NOT NULL DEFAULT false;
