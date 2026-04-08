-- PropRentalSet / PropRentalSetItem replace basket; idempotent if objects already exist (db push / partial apply).

CREATE TABLE IF NOT EXISTS "PropRentalSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled set',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropRentalSet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PropRentalSetItem" (
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

CREATE INDEX IF NOT EXISTS "PropRentalSet_userId_idx" ON "PropRentalSet"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "PropRentalSetItem_setId_offerId_key" ON "PropRentalSetItem"("setId", "offerId");
CREATE INDEX IF NOT EXISTS "PropRentalSetItem_setId_idx" ON "PropRentalSetItem"("setId");
CREATE INDEX IF NOT EXISTS "PropRentalSetItem_offerId_idx" ON "PropRentalSetItem"("offerId");

DO $$ BEGIN
    ALTER TABLE "PropRentalSet" ADD CONSTRAINT "PropRentalSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "PropRentalSetItem" ADD CONSTRAINT "PropRentalSetItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "PropRentalSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "PropRentalSetItem" ADD CONSTRAINT "PropRentalSetItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PropRentalOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Migrate basket rows only if legacy table still exists (skip if already dropped).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'PropRentalBasketItem'
    ) THEN
        INSERT INTO "PropRentalSet" ("id", "userId", "name", "createdAt", "updatedAt")
        SELECT
            'migset_' || REPLACE(gen_random_uuid()::TEXT, '-', ''),
            u."userId",
            'My set',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM (SELECT DISTINCT "userId" FROM "PropRentalBasketItem") AS u
        WHERE NOT EXISTS (
            SELECT 1 FROM "PropRentalSet" s WHERE s."userId" = u."userId"
        );

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
        INNER JOIN (
            SELECT DISTINCT ON ("userId") "id", "userId"
            FROM "PropRentalSet"
            ORDER BY "userId", "createdAt" ASC
        ) AS s ON s."userId" = bi."userId"
        ON CONFLICT ("id") DO NOTHING;

        DROP TABLE IF EXISTS "PropRentalBasketItem";
    END IF;
END $$;
