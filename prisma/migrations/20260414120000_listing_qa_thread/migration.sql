-- Threaded Q&A + cached AI overview for marketplace listings
ALTER TABLE "Listing" ADD COLUMN "qaAiOverview" TEXT;
ALTER TABLE "Listing" ADD COLUMN "qaAiOverviewUpdatedAt" TIMESTAMP(3);

CREATE TABLE "ListingQaComment" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "parentId" TEXT,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingQaComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListingQaComment_listingId_createdAt_idx" ON "ListingQaComment"("listingId", "createdAt");
CREATE INDEX "ListingQaComment_parentId_idx" ON "ListingQaComment"("parentId");

ALTER TABLE "ListingQaComment" ADD CONSTRAINT "ListingQaComment_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingQaComment" ADD CONSTRAINT "ListingQaComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ListingQaComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingQaComment" ADD CONSTRAINT "ListingQaComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
