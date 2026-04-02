-- Public reclamation yard profile (SEO, branding, contact)
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "yardSlug" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "yardTagline" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "yardAbout" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "yardLogoUrl" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "yardHeaderImageUrl" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "yardContactEmail" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "yardContactPhone" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "yardWebsiteUrl" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "yardSocialJson" JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS "SellerProfile_yardSlug_key" ON "SellerProfile" ("yardSlug");
