-- Structured weekly opening hours for reclamation yards (JSON)
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "openingHoursSchedule" JSONB;
