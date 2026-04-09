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
  const conditionGrade = searchParams.get("conditionGrade") ?? "";
  const era = searchParams.get("era") ?? "";
  const genre = searchParams.get("genre") ?? "";
  const setting = searchParams.get("setting") ?? "";
  const material = searchParams.get("material") ?? "";
  const hireOnly = searchParams.get("hireOnly") === "1";
  const availableNow = searchParams.get("availableNow") === "1";
  const idsParam = searchParams.get("ids") ?? "";
  const idList = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 48);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(24, parseInt(searchParams.get("pageSize") ?? "12", 10));
  const skip = (page - 1) * pageSize;

  const { listings, total, sortByDistance, searchOriginPostcode } = await searchListings({
    q,
    categoryId: categoryId || undefined,
    condition: condition || undefined,
    conditionGrade: conditionGrade || undefined,
    eraCsv: era || undefined,
    genreCsv: genre || undefined,
    settingCsv: setting || undefined,
    materialCsv: material || undefined,
    hireOnly,
    availableNow,
    sellerType: sellerType || undefined,
    postcode: postcode || undefined,
    radiusMiles,
    idList: idList.length > 0 ? idList : undefined,
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
