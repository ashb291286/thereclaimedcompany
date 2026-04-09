-- Demolition / refurb alerts: projects with multiple claimable lots
CREATE TYPE "DemolitionProjectStatus" AS ENUM ('draft', 'active', 'closed');
CREATE TYPE "DemolitionElementStatus" AS ENUM ('available', 'reserved', 'withdrawn');

CREATE TABLE "DemolitionProject" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "siteAddress" TEXT,
    "postcode" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "adminDistrict" TEXT,
    "region" TEXT,
    "accessWhereWhen" TEXT,
    "conditionsGeneral" TEXT,
    "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" "DemolitionProjectStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemolitionProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DemolitionElement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "pricePence" INTEGER,
    "removalMustCompleteBy" TIMESTAMP(3),
    "pickupWhereWhen" TEXT,
    "conditions" TEXT,
    "quantityNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "DemolitionElementStatus" NOT NULL DEFAULT 'available',
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemolitionElement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DemolitionElementInterest" (
    "id" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemolitionElementInterest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DemolitionProject" ADD CONSTRAINT "DemolitionProject_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DemolitionElement" ADD CONSTRAINT "DemolitionElement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DemolitionProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DemolitionElement" ADD CONSTRAINT "DemolitionElement_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DemolitionElementInterest" ADD CONSTRAINT "DemolitionElementInterest_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "DemolitionElement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DemolitionElementInterest" ADD CONSTRAINT "DemolitionElementInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "DemolitionProject_organizerId_idx" ON "DemolitionProject"("organizerId");
CREATE INDEX "DemolitionProject_status_idx" ON "DemolitionProject"("status");
CREATE INDEX "DemolitionProject_postcode_idx" ON "DemolitionProject"("postcode");
CREATE INDEX "DemolitionProject_createdAt_idx" ON "DemolitionProject"("createdAt");

CREATE INDEX "DemolitionElement_projectId_idx" ON "DemolitionElement"("projectId");
CREATE INDEX "DemolitionElement_status_idx" ON "DemolitionElement"("status");

CREATE INDEX "DemolitionElementInterest_elementId_idx" ON "DemolitionElementInterest"("elementId");
CREATE INDEX "DemolitionElementInterest_userId_idx" ON "DemolitionElementInterest"("userId");
CREATE INDEX "DemolitionElementInterest_elementId_userId_idx" ON "DemolitionElementInterest"("elementId", "userId");
