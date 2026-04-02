-- AlterTable
ALTER TABLE "Listing"
ADD COLUMN "boostedUntil" TIMESTAMP(3),
ADD COLUMN "boostLastPaymentIntentId" TEXT;
