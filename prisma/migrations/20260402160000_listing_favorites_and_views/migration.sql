-- CreateTable
CREATE TABLE "ListingFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingViewEvent" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingViewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListingFavorite_userId_listingId_key" ON "ListingFavorite"("userId", "listingId");

-- CreateIndex
CREATE INDEX "ListingFavorite_listingId_idx" ON "ListingFavorite"("listingId");

-- CreateIndex
CREATE INDEX "ListingViewEvent_listingId_createdAt_idx" ON "ListingViewEvent"("listingId", "createdAt");

-- AddForeignKey
ALTER TABLE "ListingFavorite" ADD CONSTRAINT "ListingFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingFavorite" ADD CONSTRAINT "ListingFavorite_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingViewEvent" ADD CONSTRAINT "ListingViewEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
