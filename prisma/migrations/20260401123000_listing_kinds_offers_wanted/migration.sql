-- CreateEnum
CREATE TYPE "ListingKind" AS ENUM ('sell', 'auction');
CREATE TYPE "OfferStatus" AS ENUM ('pending', 'accepted', 'declined', 'withdrawn');
CREATE TYPE "WantedAdStatus" AS ENUM ('active', 'fulfilled', 'closed');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "listingKind" "ListingKind" NOT NULL DEFAULT 'sell';
ALTER TABLE "Listing" ADD COLUMN "freeToCollector" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN "auctionEndsAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Listing_listingKind_idx" ON "Listing"("listingKind");

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "offeredPrice" INTEGER NOT NULL,
    "message" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WantedAd" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "budgetMaxPence" INTEGER,
    "postcode" TEXT,
    "status" "WantedAdStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WantedAd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bid_listingId_idx" ON "Bid"("listingId");
CREATE INDEX "Bid_bidderId_idx" ON "Bid"("bidderId");
CREATE INDEX "Bid_listingId_amountPence_idx" ON "Bid"("listingId", "amountPence");

CREATE INDEX "Offer_listingId_idx" ON "Offer"("listingId");
CREATE INDEX "Offer_buyerId_idx" ON "Offer"("buyerId");
CREATE INDEX "Offer_listingId_status_idx" ON "Offer"("listingId", "status");

CREATE INDEX "WantedAd_userId_idx" ON "WantedAd"("userId");
CREATE INDEX "WantedAd_status_idx" ON "WantedAd"("status");
CREATE INDEX "WantedAd_categoryId_idx" ON "WantedAd"("categoryId");

CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WantedAd" ADD CONSTRAINT "WantedAd_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WantedAd" ADD CONSTRAINT "WantedAd_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN "offerId" TEXT;
ALTER TABLE "Order" ADD COLUMN "bidId" TEXT;

CREATE UNIQUE INDEX "Order_offerId_key" ON "Order"("offerId");
CREATE UNIQUE INDEX "Order_bidId_key" ON "Order"("bidId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE SET NULL ON UPDATE CASCADE;
