-- AlterTable
ALTER TABLE "DrivenVehicle" ADD COLUMN "reclaimedPublicId" TEXT;
ALTER TABLE "DrivenVehicle" ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill unique Reclaimed IDs for any existing rows
UPDATE "DrivenVehicle"
SET "reclaimedPublicId" = 'TRC-DRV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
WHERE "reclaimedPublicId" IS NULL;

ALTER TABLE "DrivenVehicle" ALTER COLUMN "reclaimedPublicId" SET NOT NULL;

CREATE UNIQUE INDEX "DrivenVehicle_reclaimedPublicId_key" ON "DrivenVehicle"("reclaimedPublicId");
