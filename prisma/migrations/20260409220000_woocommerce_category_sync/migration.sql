-- WooCommerce external-product sync: per-category toggle + listing product id
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "wooCommerceSyncEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "wooCommerceCategoryId" INTEGER;

ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "wooCommerceProductId" INTEGER;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "wooCommerceSyncedAt" TIMESTAMP(3);
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "wooCommerceLastError" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Listing_wooCommerceProductId_key" ON "Listing"("wooCommerceProductId");
