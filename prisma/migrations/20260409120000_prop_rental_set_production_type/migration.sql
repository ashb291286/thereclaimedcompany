-- PropRentalSetProductionType enum + optional column on PropRentalSet
DO $$ BEGIN
  CREATE TYPE "PropRentalSetProductionType" AS ENUM (
    'FEATURE_FILM',
    'TELEVISION_STREAMING',
    'COMMERCIAL',
    'MUSIC_VIDEO',
    'THEATRE_STAGE',
    'DOCUMENTARY_FACTUAL',
    'STILLS_EDITORIAL',
    'EVENT_EXHIBITION',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "PropRentalSet" ADD COLUMN IF NOT EXISTS "productionType" "PropRentalSetProductionType";

CREATE INDEX IF NOT EXISTS "PropRentalSet_productionType_idx" ON "PropRentalSet"("productionType");
