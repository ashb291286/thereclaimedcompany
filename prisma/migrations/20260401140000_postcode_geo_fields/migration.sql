-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN "adminDistrict" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN "region" TEXT;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "adminDistrict" TEXT;
ALTER TABLE "Listing" ADD COLUMN "region" TEXT;

-- AlterTable
ALTER TABLE "WantedAd" ADD COLUMN "lat" DOUBLE PRECISION;
ALTER TABLE "WantedAd" ADD COLUMN "lng" DOUBLE PRECISION;
ALTER TABLE "WantedAd" ADD COLUMN "adminDistrict" TEXT;
ALTER TABLE "WantedAd" ADD COLUMN "region" TEXT;
