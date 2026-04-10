import { prisma } from "@/lib/db";
import { getMockAuctionDetail, MOCK_AUCTION_LISTING_ID } from "@/app/driven/_lib/mock-auction";
import type { MockAuctionDetail } from "@/app/driven/_lib/mock-auction";
import type { DrivenDocumentType, DrivenEntryCategory } from "@/generated/prisma/client";

export type AuctionDetailResult =
  | { source: "mock"; data: MockAuctionDetail }
  | { source: "database"; data: MockAuctionDetail };

function mapDbToViewModel(args: {
  auctionId: string;
  vehicleId: string;
  ownerId: string;
  reservePrice: number;
  currentBid: number;
  bidCount: number;
  watcherCount: number;
  endsAt: Date;
  reclaimedPublicId: string;
  inspectionIsSelfAssessment: boolean;
  vehicle: {
    registration: string;
    make: string;
    model: string;
    year: number;
    colour: string | null;
    mileage: number | null;
    imageUrls: string[];
    passportScore: number;
    sellerType: "PRIVATE_PARTY" | "DEALER";
    titleStatus: "UNVERIFIED" | "ESCROWED" | "TRANSFERRED";
    lineageEntries: Array<{
      id: string;
      date: Date;
      mileageAtTime: number | null;
      category: DrivenEntryCategory;
      title: string;
      description: string | null;
      documents: Array<{ type: DrivenDocumentType; fileName: string }>;
    }>;
  };
  inspection: {
    overallScore: number;
    bodyAndPaint: number;
    mechanical: number;
    interior: number;
    underbody: number;
    electrics: number;
  } | null;
  valuations: Array<{ capturedAt: Date; estimatedValue: number }>;
}): MockAuctionDetail {
  const v = args.vehicle;
  const specParts = [v.colour, v.year, v.make, v.model].filter(Boolean);
  const lineage = [...args.vehicle.lineageEntries]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((e) => ({
      id: e.id,
      date: e.date,
      mileageAtTime: e.mileageAtTime,
      category: e.category,
      title: e.title,
      description: e.description,
      documents: e.documents.map((d) => ({
        label: d.fileName,
        type: d.type,
      })),
    }));

  const valuations = args.valuations
    .slice()
    .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime())
    .map((x) => ({
      year: x.capturedAt.getUTCFullYear(),
      value: x.estimatedValue,
    }));

  return {
    auctionId: args.auctionId,
    vehicleId: args.vehicleId,
    ownerId: args.ownerId,
    reclaimedPublicId: args.reclaimedPublicId,
    inspectionIsSelfAssessment: args.inspectionIsSelfAssessment,
    title: `${v.year} ${v.make} ${v.model}`,
    specLine: specParts.join(" · "),
    registration: v.registration,
    make: v.make,
    model: v.model,
    year: v.year,
    colour: v.colour,
    mileage: v.mileage,
    imageUrls: [...v.imageUrls],
    reservePrice: args.reservePrice,
    currentBid: args.currentBid,
    bidCount: args.bidCount,
    watcherCount: args.watcherCount,
    endsAt: args.endsAt,
    sellerType: v.sellerType,
    titleStatus: v.titleStatus,
    passportScore: v.passportScore,
    inspection: args.inspection,
    valuations: valuations.length ? valuations : [{ year: new Date().getUTCFullYear(), value: args.currentBid }],
    lineage,
  };
}

export async function getAuctionDetail(id: string): Promise<AuctionDetailResult | null> {
  const row = await prisma.drivenAuctionListing.findUnique({
    where: { id },
    include: {
      vehicle: {
        include: {
          lineageEntries: {
            orderBy: { date: "desc" },
            include: { documents: true },
          },
          inspection: true,
          valuations: { orderBy: { capturedAt: "asc" }, take: 24 },
        },
      },
    },
  });

  if (!row) {
    if (id === MOCK_AUCTION_LISTING_ID) {
      return { source: "mock", data: getMockAuctionDetail() };
    }
    return null;
  }

  const v = row.vehicle;
  const ins = v.inspection;
  const inspectionIsSelfAssessment = Boolean(
    ins?.inspectorName?.toLowerCase().includes("self-assessment")
  );
  const data = mapDbToViewModel({
    auctionId: row.id,
    vehicleId: v.id,
    ownerId: v.ownerId,
    reservePrice: row.reservePrice,
    currentBid: row.currentBid,
    bidCount: row.bidCount,
    watcherCount: row.watcherCount,
    endsAt: row.endsAt,
    reclaimedPublicId: v.reclaimedPublicId,
    inspectionIsSelfAssessment,
    vehicle: {
      registration: v.registration,
      make: v.make,
      model: v.model,
      year: v.year,
      colour: v.colour,
      mileage: v.mileage,
      imageUrls: v.imageUrls,
      passportScore: v.passportScore,
      sellerType: v.sellerType,
      titleStatus: v.titleStatus,
      lineageEntries: v.lineageEntries.map((e) => ({
        id: e.id,
        date: e.date,
        mileageAtTime: e.mileageAtTime,
        category: e.category,
        title: e.title,
        description: e.description,
        documents: e.documents.map((d) => ({ type: d.type, fileName: d.fileName })),
      })),
    },
    inspection: ins
      ? {
          overallScore: ins.overallScore,
          bodyAndPaint: ins.bodyAndPaint,
          mechanical: ins.mechanical,
          interior: ins.interior,
          underbody: ins.underbody,
          electrics: ins.electrics,
        }
      : null,
    valuations: v.valuations.map((x) => ({
      capturedAt: x.capturedAt,
      estimatedValue: x.estimatedValue,
    })),
  });

  return { source: "database", data };
}
