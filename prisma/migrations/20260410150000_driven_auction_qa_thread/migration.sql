-- Threaded Q&A + cached AI overview for Driven auctions
ALTER TABLE "DrivenAuctionListing" ADD COLUMN "qaAiOverview" TEXT;
ALTER TABLE "DrivenAuctionListing" ADD COLUMN "qaAiOverviewUpdatedAt" TIMESTAMP(3);

CREATE TABLE "DrivenAuctionComment" (
    "id" TEXT NOT NULL,
    "auctionListingId" TEXT NOT NULL,
    "parentId" TEXT,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrivenAuctionComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DrivenAuctionComment_auctionListingId_createdAt_idx" ON "DrivenAuctionComment"("auctionListingId", "createdAt");
CREATE INDEX "DrivenAuctionComment_parentId_idx" ON "DrivenAuctionComment"("parentId");

ALTER TABLE "DrivenAuctionComment" ADD CONSTRAINT "DrivenAuctionComment_auctionListingId_fkey" FOREIGN KEY ("auctionListingId") REFERENCES "DrivenAuctionListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DrivenAuctionComment" ADD CONSTRAINT "DrivenAuctionComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DrivenAuctionComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DrivenAuctionComment" ADD CONSTRAINT "DrivenAuctionComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
