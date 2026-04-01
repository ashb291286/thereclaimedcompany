-- CreateTable
CREATE TABLE "CarbonFactor" (
    "id" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "co2PerUnit" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ICE Database',
    "label" TEXT NOT NULL,
    "densityKgPerM3" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarbonFactor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarbonFactor_materialType_unitType_key" ON "CarbonFactor"("materialType", "unitType");

-- CreateIndex
CREATE INDEX "CarbonFactor_materialType_idx" ON "CarbonFactor"("materialType");

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "materialType" TEXT,
ADD COLUMN "materialQuantity" DOUBLE PRECISION,
ADD COLUMN "materialUnit" TEXT,
ADD COLUMN "distanceSavedKm" DOUBLE PRECISION,
ADD COLUMN "carbonSavedKg" DOUBLE PRECISION,
ADD COLUMN "carbonWasteDivertedKg" DOUBLE PRECISION,
ADD COLUMN "carbonImpactJson" JSONB;
