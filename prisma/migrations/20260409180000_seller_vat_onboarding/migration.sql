-- Reclamation yard VAT flag (prices ex VAT when true; +20% for buyers)
ALTER TABLE "SellerProfile" ADD COLUMN "vatRegistered" BOOLEAN NOT NULL DEFAULT false;
