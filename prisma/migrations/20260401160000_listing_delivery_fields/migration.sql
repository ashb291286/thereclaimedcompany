-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "offersDelivery" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN "deliveryNotes" TEXT;
ALTER TABLE "Listing" ADD COLUMN "deliveryCostPence" INTEGER;
