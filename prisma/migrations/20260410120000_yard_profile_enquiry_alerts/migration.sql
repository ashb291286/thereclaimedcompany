-- Yard profile extensions, enquiries, stock alerts
ALTER TABLE "SellerProfile" ADD COLUMN "yardPrimaryMaterials" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "SellerProfile" ADD COLUMN "yardTrustFlagsJson" JSONB;
ALTER TABLE "SellerProfile" ADD COLUMN "yardCustomTrustLine" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN "yardDeliveryOptionsJson" JSONB;
ALTER TABLE "SellerProfile" ADD COLUMN "yardServiceAreas" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN "yardWhatsApp" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN "yearEstablished" INTEGER;
ALTER TABLE "SellerProfile" ADD COLUMN "yardTradePublic" TEXT;
ALTER TABLE "SellerProfile" ADD COLUMN "yardResponseTimeNote" TEXT;

CREATE TABLE "YardEnquiry" (
    "id" TEXT NOT NULL,
    "yardUserId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "quantity" TEXT,
    "imageUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YardEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "YardEnquiry_yardUserId_createdAt_idx" ON "YardEnquiry"("yardUserId", "createdAt");

ALTER TABLE "YardEnquiry" ADD CONSTRAINT "YardEnquiry_yardUserId_fkey" FOREIGN KEY ("yardUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "YardEnquiry" ADD CONSTRAINT "YardEnquiry_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "YardStockAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YardStockAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "YardStockAlert_sellerId_idx" ON "YardStockAlert"("sellerId");
CREATE INDEX "YardStockAlert_userId_createdAt_idx" ON "YardStockAlert"("userId", "createdAt");

ALTER TABLE "YardStockAlert" ADD CONSTRAINT "YardStockAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "YardStockAlert" ADD CONSTRAINT "YardStockAlert_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "YardStockAlert" ADD CONSTRAINT "YardStockAlert_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One alert per user per yard for "all categories" (categoryId IS NULL)
CREATE UNIQUE INDEX "YardStockAlert_user_seller_all_idx" ON "YardStockAlert" ("userId", "sellerId") WHERE "categoryId" IS NULL;
-- One per user per yard per category when scoped
CREATE UNIQUE INDEX "YardStockAlert_user_seller_category_idx" ON "YardStockAlert" ("userId", "sellerId", "categoryId") WHERE "categoryId" IS NOT NULL;
