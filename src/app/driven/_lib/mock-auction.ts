import type { DrivenDocumentType, DrivenEntryCategory } from "@/generated/prisma/client";

export const MOCK_AUCTION_LISTING_ID = "driven-mock-auction-1";
export const MOCK_VEHICLE_ID = "driven-mock-vehicle-1";

/** Hero image for sample auction / list card (stable URL). */
export const MOCK_DRIVEN_VEHICLE_IMAGE_URL =
  "https://images.unsplash.com/photo-1503376780353-7e6690667a46?auto=format&fit=crop&w=1400&q=80";

export type MockLineageRow = {
  id: string;
  date: Date;
  mileageAtTime: number | null;
  category: DrivenEntryCategory;
  title: string;
  description: string | null;
  documents: { label: string; type: DrivenDocumentType }[];
};

export type MockAuctionDetail = {
  auctionId: string;
  vehicleId: string;
  /** Vehicle owner (seller); null for demo listing — no live posting. */
  ownerId: string | null;
  reclaimedPublicId: string;
  inspectionIsSelfAssessment: boolean;
  title: string;
  specLine: string;
  registration: string;
  make: string;
  model: string;
  year: number;
  colour: string | null;
  mileage: number | null;
  imageUrls: string[];
  reservePrice: number;
  currentBid: number;
  bidCount: number;
  watcherCount: number;
  endsAt: Date;
  sellerType: "PRIVATE_PARTY" | "DEALER";
  titleStatus: "UNVERIFIED" | "ESCROWED" | "TRANSFERRED";
  passportScore: number;
  inspection: {
    overallScore: number;
    bodyAndPaint: number;
    mechanical: number;
    interior: number;
    underbody: number;
    electrics: number;
  } | null;
  valuations: { year: number; value: number }[];
  lineage: MockLineageRow[];
};

export function getMockAuctionDetail(): MockAuctionDetail {
  const endsAt = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000);
  return {
    auctionId: MOCK_AUCTION_LISTING_ID,
    vehicleId: MOCK_VEHICLE_ID,
    ownerId: null,
    reclaimedPublicId: "TRC-DRV-DEMO0001",
    inspectionIsSelfAssessment: false,
    title: "1987 Porsche 911 Carrera",
    specLine: "Guards Red · G50 5-speed · Sunroof delete",
    registration: "ABC 1T",
    make: "Porsche",
    model: "911 Carrera",
    year: 1987,
    colour: "Guards Red",
    mileage: 67400,
    imageUrls: [MOCK_DRIVEN_VEHICLE_IMAGE_URL],
    reservePrice: 3500000,
    currentBid: 3850000,
    bidCount: 14,
    watcherCount: 62,
    endsAt,
    sellerType: "PRIVATE_PARTY",
    titleStatus: "ESCROWED",
    passportScore: 88,
    inspection: {
      overallScore: 86,
      bodyAndPaint: 88,
      mechanical: 84,
      interior: 82,
      underbody: 85,
      electrics: 87,
    },
    valuations: [
      { year: 2021, value: 3200000 },
      { year: 2022, value: 3350000 },
      { year: 2023, value: 3500000 },
      { year: 2024, value: 3680000 },
      { year: 2025, value: 3820000 },
    ],
    lineage: [
      {
        id: "l1",
        date: new Date("2025-03-01"),
        mileageAtTime: 67200,
        category: "DOCUMENT",
        title: "Listed on Driven · Reclaimed",
        description: "Full passport uploaded · inspection ordered",
        documents: [{ label: "Inspection report PDF", type: "INSPECTION" }],
      },
      {
        id: "l2",
        date: new Date("2022-11-15"),
        mileageAtTime: 64800,
        category: "SERVICE",
        title: "Engine out service · Porsche specialist",
        description: "Rear main seal, IMS bearing, clutch · £4,200",
        documents: [
          { label: "Invoice scan", type: "INVOICE" },
          { label: "Workshop photos x12", type: "PHOTO" },
        ],
      },
      {
        id: "l3",
        date: new Date("2019-06-01"),
        mileageAtTime: 61200,
        category: "OWNERSHIP",
        title: "Acquired by current owner",
        description: "Purchased privately · 61,200 miles",
        documents: [{ label: "Bill of sale", type: "CERTIFICATE" }],
      },
      {
        id: "l4",
        date: new Date("2016-07-10"),
        mileageAtTime: 58000,
        category: "BODYWORK",
        title: "Respray · Guards Red factory match",
        description: "Bodywork by Autocolour, Bristol · full strip and repaint",
        documents: [{ label: "Paint depth readings", type: "OTHER" }],
      },
      {
        id: "l5",
        date: new Date("1987-01-01"),
        mileageAtTime: null,
        category: "FACTORY",
        title: "Delivered new · Stuttgart",
        description: "Matching numbers · original window sticker uploaded",
        documents: [{ label: "Factory build sheet", type: "BUILD_SHEET" }],
      },
    ],
  };
}
