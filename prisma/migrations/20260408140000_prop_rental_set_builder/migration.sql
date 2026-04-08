-- CreateTable
CREATE TABLE "PropRentalSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled set',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropRentalSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropRentalSetItem" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "hireStart" TIMESTAMP(3) NOT NULL,
    "hireEnd" TIMESTAMP(3) NOT NULL,
    "fulfillment" "PropRentalFulfillment" NOT NULL,
    "hirerOrgName" TEXT,
    "productionNotes" TEXT,
    "deliveryArrangementNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropRentalSetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropRentalSet_userId_idx" ON "PropRentalSet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PropRentalSetItem_setId_offerId_key" ON "PropRentalSetItem"("setId", "offerId");
CREATE INDEX "PropRentalSetItem_setId_idx" ON "PropRentalSetItem"("setId");
CREATE INDEX "PropRentalSetItem_offerId_idx" ON "PropRentalSetItem"("offerId");

-- AddForeignKey
ALTER TABLE "PropRentalSet" ADD CONSTRAINT "PropRentalSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropRentalSetItem" ADD CONSTRAINT "PropRentalSetItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "PropRentalSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropRentalSetItem" ADD CONSTRAINT "PropRentalSetItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PropRentalOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate basket rows into one set per user, then items
INSERT INTO "PropRentalSet" ("id", "userId", "name", "createdAt", "updatedAt")
SELECT
    'migset_' || REPLACE(gen_random_uuid()::TEXT, '-', ''),
    u."userId",
    'My set',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "userId" FROM "PropRentalBasketItem") AS u;

INSERT INTO "PropRentalSetItem" (
    "id",
    "setId",
    "offerId",
    "hireStart",
    "hireEnd",
    "fulfillment",
    "hirerOrgName",
    "productionNotes",
    "deliveryArrangementNotes",
    "createdAt",
    "updatedAt"
)
SELECT
    bi."id",
    s."id",
    bi."offerId",
    bi."hireStart",
    bi."hireEnd",
    bi."fulfillment",
    bi."hirerOrgName",
    bi."productionNotes",
    bi."deliveryArrangementNotes",
    bi."createdAt",
    bi."updatedAt"
FROM "PropRentalBasketItem" bi
INNER JOIN "PropRentalSet" s ON s."userId" = bi."userId";

-- DropTable
DROP TABLE "PropRentalBasketItem";
