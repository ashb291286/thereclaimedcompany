-- CreateEnum
CREATE TYPE "ListingPricingMode" AS ENUM ('LOT', 'PER_UNIT');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "pricingMode" "ListingPricingMode" NOT NULL DEFAULT 'LOT';
ALTER TABLE "Listing" ADD COLUMN "unitsAvailable" INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
