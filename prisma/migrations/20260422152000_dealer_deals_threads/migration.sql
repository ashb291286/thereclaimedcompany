CREATE TYPE "DealerDealStatus" AS ENUM ('open', 'presented', 'completed', 'archived');

CREATE TABLE "DealerDeal" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "status" "DealerDealStatus" NOT NULL DEFAULT 'open',
  "agreedOfferId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DealerDeal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DealerDealMessage" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DealerDealMessage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order" ADD COLUMN "dealerDealId" TEXT;

CREATE UNIQUE INDEX "DealerDeal_listingId_buyerId_key" ON "DealerDeal"("listingId", "buyerId");
CREATE UNIQUE INDEX "DealerDeal_agreedOfferId_key" ON "DealerDeal"("agreedOfferId");
CREATE INDEX "DealerDeal_sellerId_updatedAt_idx" ON "DealerDeal"("sellerId", "updatedAt");
CREATE INDEX "DealerDeal_buyerId_updatedAt_idx" ON "DealerDeal"("buyerId", "updatedAt");
CREATE INDEX "DealerDealMessage_dealId_createdAt_idx" ON "DealerDealMessage"("dealId", "createdAt");
CREATE INDEX "DealerDealMessage_senderId_createdAt_idx" ON "DealerDealMessage"("senderId", "createdAt");
CREATE INDEX "Order_dealerDealId_idx" ON "Order"("dealerDealId");

ALTER TABLE "DealerDeal" ADD CONSTRAINT "DealerDeal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealerDeal" ADD CONSTRAINT "DealerDeal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealerDeal" ADD CONSTRAINT "DealerDeal_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealerDeal" ADD CONSTRAINT "DealerDeal_agreedOfferId_fkey" FOREIGN KEY ("agreedOfferId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DealerDealMessage" ADD CONSTRAINT "DealerDealMessage_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "DealerDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealerDealMessage" ADD CONSTRAINT "DealerDealMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_dealerDealId_fkey" FOREIGN KEY ("dealerDealId") REFERENCES "DealerDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
