-- AlterTable
ALTER TABLE "PropRentalOffer"
ADD COLUMN "minimumHireWeeks" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "PropRentalBasketItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "hireStart" TIMESTAMP(3) NOT NULL,
    "hireEnd" TIMESTAMP(3) NOT NULL,
    "fulfillment" "PropRentalFulfillment" NOT NULL,
    "hirerOrgName" TEXT,
    "productionNotes" TEXT,
    "deliveryArrangementNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropRentalBasketItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropRentalBasketItem_userId_offerId_key" ON "PropRentalBasketItem"("userId", "offerId");

-- CreateIndex
CREATE INDEX "PropRentalBasketItem_userId_idx" ON "PropRentalBasketItem"("userId");

-- CreateIndex
CREATE INDEX "PropRentalBasketItem_offerId_idx" ON "PropRentalBasketItem"("offerId");

-- AddForeignKey
ALTER TABLE "PropRentalBasketItem" ADD CONSTRAINT "PropRentalBasketItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropRentalBasketItem" ADD CONSTRAINT "PropRentalBasketItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PropRentalOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
