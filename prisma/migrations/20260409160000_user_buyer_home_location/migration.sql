-- Buyer welcome + saved home for listing distances
ALTER TABLE "User" ADD COLUMN "registrationIntent" TEXT;
ALTER TABLE "User" ADD COLUMN "homePostcode" TEXT;
ALTER TABLE "User" ADD COLUMN "homeLat" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN "homeLng" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN "homeAdminDistrict" TEXT;
ALTER TABLE "User" ADD COLUMN "homeRegion" TEXT;
ALTER TABLE "User" ADD COLUMN "buyerWelcomeCompletedAt" TIMESTAMP(3);
