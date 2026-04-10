-- Town / BUA / TTWA label from postcodes.io for user-facing location lines
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "postcodeLocality" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "postcodeLocality" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "homePostcodeLocality" TEXT;
ALTER TABLE "WantedAd" ADD COLUMN IF NOT EXISTS "postcodeLocality" TEXT;
ALTER TABLE "DemolitionProject" ADD COLUMN IF NOT EXISTS "postcodeLocality" TEXT;
