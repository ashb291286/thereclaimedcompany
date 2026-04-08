-- Restore marketplace visibility after prop hire ends (see syncListingMarketplaceVisibilityForOffer).
ALTER TABLE "Listing" ADD COLUMN "marketplaceVisibleBeforePropHirePause" BOOLEAN;
