-- CreateEnum
CREATE TYPE "PropRentalFulfillment" AS ENUM ('COLLECT_AND_RETURN', 'YARD_DELIVERS_AND_COLLECTS', 'ARRANGE_SEPARATELY');

-- CreateEnum
CREATE TYPE "PropRentalBookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'OUT_ON_HIRE', 'RETURNED', 'CANCELLED', 'DECLINED');

-- CreateTable
CREATE TABLE "PropRentalOffer" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "weeklyHirePence" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "yardHireNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropRentalOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropRentalUnavailability" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropRentalUnavailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropRentalBooking" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "hirerId" TEXT NOT NULL,
    "hireStart" TIMESTAMP(3) NOT NULL,
    "hireEnd" TIMESTAMP(3) NOT NULL,
    "billableWeeks" INTEGER NOT NULL,
    "totalHirePence" INTEGER NOT NULL,
    "status" "PropRentalBookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "fulfillment" "PropRentalFulfillment" NOT NULL,
    "contractAcceptedAt" TIMESTAMP(3),
    "hirerOrgName" TEXT,
    "productionNotes" TEXT,
    "deliveryArrangementNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropRentalBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropRentalOffer_listingId_key" ON "PropRentalOffer"("listingId");

-- CreateIndex
CREATE INDEX "PropRentalOffer_isActive_idx" ON "PropRentalOffer"("isActive");

-- CreateIndex
CREATE INDEX "PropRentalUnavailability_offerId_idx" ON "PropRentalUnavailability"("offerId");

-- CreateIndex
CREATE INDEX "PropRentalUnavailability_offerId_startDate_idx" ON "PropRentalUnavailability"("offerId", "startDate");

-- CreateIndex
CREATE INDEX "PropRentalBooking_offerId_idx" ON "PropRentalBooking"("offerId");

-- CreateIndex
CREATE INDEX "PropRentalBooking_hirerId_idx" ON "PropRentalBooking"("hirerId");

-- CreateIndex
CREATE INDEX "PropRentalBooking_status_idx" ON "PropRentalBooking"("status");

-- CreateIndex
CREATE INDEX "PropRentalBooking_hireStart_hireEnd_idx" ON "PropRentalBooking"("hireStart", "hireEnd");

-- AddForeignKey
ALTER TABLE "PropRentalOffer" ADD CONSTRAINT "PropRentalOffer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropRentalUnavailability" ADD CONSTRAINT "PropRentalUnavailability_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PropRentalOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropRentalBooking" ADD CONSTRAINT "PropRentalBooking_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PropRentalOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropRentalBooking" ADD CONSTRAINT "PropRentalBooking_hirerId_fkey" FOREIGN KEY ("hirerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
