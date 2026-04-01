import { searchListings } from "@/lib/listing-search";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const condition = searchParams.get("condition") ?? "";
  const postcode = searchParams.get("postcode") ?? "";
  const radiusRaw = parseInt(searchParams.get("radius") ?? "50", 10);
  const radiusMiles = Number.isFinite(radiusRaw)
    ? Math.min(100, Math.max(5, radiusRaw))
    : 50;
  const sellerType = searchParams.get("sellerType") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(24, parseInt(searchParams.get("pageSize") ?? "12", 10));
  const skip = (page - 1) * pageSize;

  const { listings, total, sortByDistance, searchOriginPostcode } = await searchListings({
    q,
    categoryId: categoryId || undefined,
    condition: condition || undefined,
    sellerType: sellerType || undefined,
    postcode: postcode || undefined,
    radiusMiles,
    skip,
    take: pageSize,
  });

  return NextResponse.json({
    listings,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    sortByDistance,
    searchOriginPostcode,
  });
}
