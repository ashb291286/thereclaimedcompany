-- CreateEnum
CREATE TYPE "ListingLocalYardAlertStatus" AS ENUM ('PENDING', 'DECLINED');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "notifyLocalYards" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ListingLocalYardAlert" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "yardUserId" TEXT NOT NULL,
    "status" "ListingLocalYardAlertStatus" NOT NULL DEFAULT 'PENDING',
    "distanceMiles" DOUBLE PRECISION,
    "linkedOfferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ListingLocalYardAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListingLocalYardAlert_linkedOfferId_key" ON "ListingLocalYardAlert"("linkedOfferId");

CREATE UNIQUE INDEX "ListingLocalYardAlert_listingId_yardUserId_key" ON "ListingLocalYardAlert"("listingId", "yardUserId");

CREATE INDEX "ListingLocalYardAlert_yardUserId_idx" ON "ListingLocalYardAlert"("yardUserId");

CREATE INDEX "ListingLocalYardAlert_listingId_idx" ON "ListingLocalYardAlert"("listingId");

-- AddForeignKey
ALTER TABLE "ListingLocalYardAlert" ADD CONSTRAINT "ListingLocalYardAlert_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ListingLocalYardAlert" ADD CONSTRAINT "ListingLocalYardAlert_yardUserId_fkey" FOREIGN KEY ("yardUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ListingLocalYardAlert" ADD CONSTRAINT "ListingLocalYardAlert_linkedOfferId_fkey" FOREIGN KEY ("linkedOfferId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
