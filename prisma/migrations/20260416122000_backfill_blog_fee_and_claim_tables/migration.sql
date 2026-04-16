-- Backfill missing tables/columns when prior migration was empty.

-- Blog publishing table
CREATE TABLE IF NOT EXISTS "BlogPost" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "excerpt" TEXT,
  "htmlContent" TEXT NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlogPost_slug_key" ON "BlogPost"("slug");
CREATE INDEX IF NOT EXISTS "BlogPost_published_publishedAt_idx" ON "BlogPost"("published", "publishedAt");
CREATE INDEX IF NOT EXISTS "BlogPost_createdAt_idx" ON "BlogPost"("createdAt");

-- Marketplace fee settings singleton
CREATE TABLE IF NOT EXISTS "MarketplaceFeeSettings" (
  "id" TEXT NOT NULL,
  "commissionPercentBps" INTEGER NOT NULL DEFAULT 1000,
  "commissionFixedPence" INTEGER NOT NULL DEFAULT 20,
  "commissionVatRateBps" INTEGER NOT NULL DEFAULT 2000,
  "stripeFeePercentBps" INTEGER NOT NULL DEFAULT 150,
  "stripeFeeFixedPence" INTEGER NOT NULL DEFAULT 20,
  "digitalMarketplaceFeeBps" INTEGER NOT NULL DEFAULT 0,
  "digitalMarketplaceFeeFixedPence" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceFeeSettings_pkey" PRIMARY KEY ("id")
);

-- Per-order invoice breakdowns
CREATE TABLE IF NOT EXISTS "OrderChargeBreakdown" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "grossAmountPence" INTEGER NOT NULL,
  "commissionNetPence" INTEGER NOT NULL,
  "commissionVatPence" INTEGER NOT NULL,
  "commissionGrossPence" INTEGER NOT NULL,
  "stripeProcessingFeePence" INTEGER NOT NULL,
  "digitalMarketplaceFeePence" INTEGER NOT NULL,
  "totalMarketplaceFeesPence" INTEGER NOT NULL,
  "sellerPayoutPence" INTEGER NOT NULL,
  "commissionPercentBps" INTEGER NOT NULL,
  "commissionFixedPence" INTEGER NOT NULL,
  "commissionVatRateBps" INTEGER NOT NULL,
  "stripeFeePercentBps" INTEGER NOT NULL,
  "stripeFeeFixedPence" INTEGER NOT NULL,
  "digitalMarketplaceFeeBps" INTEGER NOT NULL,
  "digitalMarketplaceFeeFixedPence" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderChargeBreakdown_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrderChargeBreakdown_orderId_key" ON "OrderChargeBreakdown"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "OrderChargeBreakdown_invoiceNumber_key" ON "OrderChargeBreakdown"("invoiceNumber");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'OrderChargeBreakdown_orderId_fkey'
  ) THEN
    ALTER TABLE "OrderChargeBreakdown"
    ADD CONSTRAINT "OrderChargeBreakdown_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Import/claim support fields on seller profiles
ALTER TABLE "SellerProfile"
  ADD COLUMN IF NOT EXISTS "importedByAdmin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "claimCode" TEXT,
  ADD COLUMN IF NOT EXISTS "claimContactEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "SellerProfile_claimCode_key" ON "SellerProfile"("claimCode");
