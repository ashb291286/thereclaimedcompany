import { parseBrowseRadiusParam } from "@/lib/browse-radius";
import { resolveCategoryBrowseRow } from "@/lib/category-browse";
import { withProxiedListingImages } from "@/lib/listing-image-url";
import { searchListings } from "@/lib/listing-search";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const condition = searchParams.get("condition") ?? "";
  const postcode = searchParams.get("postcode") ?? "";
  const { miles: radiusMiles, nationwide: radiusNationwide } = parseBrowseRadiusParam(
    searchParams.get("radius") ?? undefined
  );
  const sellerType = searchParams.get("sellerType") ?? "";
  const source = searchParams.get("source") ?? "";
  const browseSource = source === "emporiums" ? "emporiums" : "yards";
  const effectiveSellerType =
    sellerType || (browseSource === "emporiums" ? "dealer" : "");
  const excludeDealer = browseSource === "yards" && !sellerType;
  const conditionGrade = searchParams.get("conditionGrade") ?? "";
  const isYardSellerFilter = effectiveSellerType === "reclamation_yard";
  const era = isYardSellerFilter ? "" : (searchParams.get("era") ?? "");
  const genre = isYardSellerFilter ? "" : (searchParams.get("genre") ?? "");
  const setting = searchParams.get("setting") ?? "";
  const material = isYardSellerFilter ? "" : (searchParams.get("material") ?? "");
  const hireOnly = searchParams.get("hireOnly") === "1";
  const availableNow = searchParams.get("availableNow") === "1";
  const idsParam = searchParams.get("ids") ?? "";
  const idList = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 48);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(24, parseInt(searchParams.get("pageSize") ?? "15", 10));
  const skip = (page - 1) * pageSize;

  const session = await auth();
  const userPrefs = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { homePostcode: true, homeLat: true, homeLng: true },
      })
    : null;

  const categoryRaw = category.trim() || categoryId.trim();
  const categoryRow = await resolveCategoryBrowseRow(categoryRaw || undefined);

  const { listings, total, sortByDistance, searchOriginPostcode } = await searchListings({
    q,
    categoryId: categoryRow?.id,
    condition: condition || undefined,
    conditionGrade: conditionGrade || undefined,
    eraCsv: era || undefined,
    genreCsv: genre || undefined,
    settingCsv: setting || undefined,
    materialCsv: material || undefined,
    hireOnly,
    availableNow,
    sellerType: effectiveSellerType || undefined,
    excludeDealer,
    postcode: postcode || undefined,
    radiusMiles,
    radiusNationwide,
    idList: idList.length > 0 ? idList : undefined,
    skip,
    take: pageSize,
    viewerHomeLat: userPrefs?.homeLat ?? undefined,
    viewerHomeLng: userPrefs?.homeLng ?? undefined,
    viewerHomePostcode: userPrefs?.homePostcode ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    listingType: searchParams.get("listingType") ?? undefined,
  });

  return NextResponse.json({
    listings: listings.map(withProxiedListingImages),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    sortByDistance,
    searchOriginPostcode,
  });
}
