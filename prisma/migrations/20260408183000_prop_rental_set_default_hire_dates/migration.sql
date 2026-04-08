-- AlterTable (idempotent: columns may already exist from db push / partial apply)
ALTER TABLE "PropRentalSet" ADD COLUMN IF NOT EXISTS "defaultHireStart" TIMESTAMP(3);
ALTER TABLE "PropRentalSet" ADD COLUMN IF NOT EXISTS "defaultHireEnd" TIMESTAMP(3);
