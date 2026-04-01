-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE 'ended';
ALTER TYPE "ListingStatus" ADD VALUE 'payment_pending';

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "auctionReservePence" INTEGER,
ADD COLUMN "auctionFinalizedAt" TIMESTAMP(3);

ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "bidPaymentMethodId" TEXT;

CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
