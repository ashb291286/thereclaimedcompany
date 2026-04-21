ALTER TABLE "SellerProfile"
ADD COLUMN "isRegisteredCharity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "charityNumber" TEXT;
