-- Prop Yard comprehensive listing fields, draft persistence, and verification queue.
-- Idempotent for environments with partial applies.

DO $$
BEGIN
  CREATE TYPE "PropConditionGrade" AS ENUM ('A', 'B', 'C');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PropAuthenticityVerifiedBy" AS ENUM (
    'YARD_OWNER_KNOWLEDGE',
    'INDEPENDENT_EXPERT',
    'SALVO_MEMBER',
    'LAPADA_MEMBER',
    'UNVERIFIED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PropListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PropHireMinPeriod" AS ENUM ('ONE_DAY', 'THREE_DAYS', 'ONE_WEEK', 'TWO_WEEKS', 'ONE_MONTH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PropDeliveryPriceType" AS ENUM ('FREE', 'FIXED', 'POA', 'DISTANCE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "descriptionShort" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "descriptionFull" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "propSubcategory" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "quantityAvailable" INTEGER;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "dimensionsH" DOUBLE PRECISION;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "dimensionsW" DOUBLE PRECISION;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "dimensionsD" DOUBLE PRECISION;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "weightKg" DOUBLE PRECISION;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "propMaterials" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "propColours" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "colourHex" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "colourName" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "conditionGrade" "PropConditionGrade";
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "eraTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "dateSpecific" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "styleTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "geographicOrigin" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "genreTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "settingInteriorTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "settingExteriorTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "flagSuitableCloseup" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "flagCameraReady" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "flagPreviouslyUsedOnProduction" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "flagFragile" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "flagOutdoorSuitable" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "flagMultiplesAvailable" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "flagCanSourceMatching" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "flagStudioDelivery" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "productionName" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "studioTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "studioOtherText" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "provenanceBuilding" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "provenanceDateText" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "provenanceRegion" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "provenanceDocs" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "provenanceDocsAvailable" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "authenticityVerifiedBy" "PropAuthenticityVerifiedBy";
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "restorationNotes" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "conditionNotes" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "hireEnabled" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "saleEnabled" BOOLEAN DEFAULT true;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "hirePriceWeekPence" INTEGER;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "hireMinPeriod" "PropHireMinPeriod";
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "hireDepositPct" DOUBLE PRECISION;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "hireBlockedDates" JSONB;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "damageWaiverTerms" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "salePricePence" INTEGER;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "saleOffers" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "collectionAddress" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "collectionAvailable" BOOLEAN DEFAULT true;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "collectionOpeningHours" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "deliveryAvailable" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "deliveryRadiusMiles" INTEGER;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "deliveryNationwide" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "deliveryPriceType" "PropDeliveryPriceType";
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "deliveryPricePence" INTEGER;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "specialistHandling" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "regularStudioRun" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "specialistTransportRequired" BOOLEAN DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "deliveryLeadTime" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "heroImageUrl" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "detailShots" JSONB;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "view360Url" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "seenOnScreenProductions" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "propListingStatus" "PropListingStatus" DEFAULT 'DRAFT';
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "PropListingDraft" (
  "id" TEXT PRIMARY KEY,
  "yardId" TEXT NOT NULL,
  "listingId" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "SeenOnScreenVerificationRequest" (
  "id" TEXT PRIMARY KEY,
  "listingId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "productionName" TEXT NOT NULL,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "Listing_hireEnabled_saleEnabled_propListingStatus_idx"
  ON "Listing"("hireEnabled", "saleEnabled", "propListingStatus");
CREATE INDEX IF NOT EXISTS "Listing_conditionGrade_idx" ON "Listing"("conditionGrade");
CREATE INDEX IF NOT EXISTS "Listing_authenticityVerifiedBy_idx" ON "Listing"("authenticityVerifiedBy");
CREATE INDEX IF NOT EXISTS "Listing_eraTags_gin_idx" ON "Listing" USING GIN ("eraTags");
CREATE INDEX IF NOT EXISTS "Listing_styleTags_gin_idx" ON "Listing" USING GIN ("styleTags");
CREATE INDEX IF NOT EXISTS "Listing_genreTags_gin_idx" ON "Listing" USING GIN ("genreTags");
CREATE INDEX IF NOT EXISTS "Listing_settingInteriorTags_gin_idx" ON "Listing" USING GIN ("settingInteriorTags");
CREATE INDEX IF NOT EXISTS "Listing_settingExteriorTags_gin_idx" ON "Listing" USING GIN ("settingExteriorTags");
CREATE INDEX IF NOT EXISTS "Listing_propMaterials_gin_idx" ON "Listing" USING GIN ("propMaterials");

CREATE INDEX IF NOT EXISTS "PropRentalOffer_weeklyHirePence_idx" ON "PropRentalOffer"("weeklyHirePence");
CREATE INDEX IF NOT EXISTS "PropListingDraft_yardId_updatedAt_idx" ON "PropListingDraft"("yardId", "updatedAt");
CREATE INDEX IF NOT EXISTS "PropListingDraft_listingId_idx" ON "PropListingDraft"("listingId");
CREATE INDEX IF NOT EXISTS "SeenOnScreenVerificationRequest_listingId_status_idx"
  ON "SeenOnScreenVerificationRequest"("listingId", "status");
CREATE INDEX IF NOT EXISTS "SeenOnScreenVerificationRequest_requestedById_createdAt_idx"
  ON "SeenOnScreenVerificationRequest"("requestedById", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PropListingDraft_yardId_fkey'
  ) THEN
    ALTER TABLE "PropListingDraft"
      ADD CONSTRAINT "PropListingDraft_yardId_fkey"
      FOREIGN KEY ("yardId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PropListingDraft_listingId_fkey'
  ) THEN
    ALTER TABLE "PropListingDraft"
      ADD CONSTRAINT "PropListingDraft_listingId_fkey"
      FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SeenOnScreenVerificationRequest_listingId_fkey'
  ) THEN
    ALTER TABLE "SeenOnScreenVerificationRequest"
      ADD CONSTRAINT "SeenOnScreenVerificationRequest_listingId_fkey"
      FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SeenOnScreenVerificationRequest_requestedById_fkey'
  ) THEN
    ALTER TABLE "SeenOnScreenVerificationRequest"
      ADD CONSTRAINT "SeenOnScreenVerificationRequest_requestedById_fkey"
      FOREIGN KEY ("requestedById") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SeenOnScreenVerificationRequest_reviewedById_fkey'
  ) THEN
    ALTER TABLE "SeenOnScreenVerificationRequest"
      ADD CONSTRAINT "SeenOnScreenVerificationRequest_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
