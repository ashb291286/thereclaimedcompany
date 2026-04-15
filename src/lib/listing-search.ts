import { prisma } from "@/lib/db";
import type { Condition, Prisma } from "@/generated/prisma/client";
import { haversineMiles, latLngBoundingBoxMiles } from "@/lib/geo";
import { lookupUkPostcode } from "@/lib/postcode-uk";
import { buyerGrossPenceFromSellerNetPence, sellerChargesVat } from "@/lib/vat-pricing";

const searchListingInclude = {
  category: true,
  seller: {
    select: {
      role: true,
      sellerProfile: { select: { vatRegistered: true, salvoCodeMember: true } },
    },
  },
} as const;

export type SearchListingRow = Prisma.ListingGetPayload<{ include: typeof searchListingInclude }> & {
  distanceMiles: number | null;
};

export type ListingSearchParams = {
  q?: string;
  categoryId?: string;
  condition?: string;
  conditionGrade?: string;
  sellerType?: string;
  postcode?: string;
  eraCsv?: string;
  genreCsv?: string;
  settingCsv?: string;
  materialCsv?: string;
  hireOnly?: boolean;
  availableNow?: boolean;
  /** auction | buy_now (fixed-price sell) | free_collect */
  listingType?: string;
  radiusMiles: number;
  /** No distance cap when sorting/filtering from a search origin (UK-wide). */
  radiusNationwide?: boolean;
  idList?: string[];
  skip: number;
  take: number;
  /** Signed-in buyer’s saved home (used for distance when search postcode is empty). */
  viewerHomeLat?: number | null;
  viewerHomeLng?: number | null;
  viewerHomePostcode?: string | null;
  /** recommended | nearest | price_asc | price_desc | newest (from query string). */
  sort?: string;
};

export type BrowseListingSort = "recommended" | "nearest" | "price_asc" | "price_desc" | "newest";

/** Normalise listing type filter for URLs and `<select>` value. */
export function browseListingTypeQueryParam(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (v === "auction" || v === "buy_now" || v === "free_collect") return v;
  return "";
}

/** Normalise `sort` query for client UI (hides invalid values; nearest when no location). */
export function browseSortQueryParam(raw: string | undefined, nearestAvailable: boolean): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  if (v === "nearest" && !nearestAvailable) return "";
  if (v === "nearest" || v === "price_asc" || v === "price_desc" || v === "newest") return v;
  return "";
}

function browseSortPricePenceGbp(l: SearchListingRow): number {
  const v = sellerChargesVat({
    sellerRole: l.seller.role,
    vatRegistered: l.seller.sellerProfile?.vatRegistered,
  });
  return buyerGrossPenceFromSellerNetPence(l.price, v);
}

/** In-memory sort for bbox / id-list results. */
function sortSearchRows(rows: SearchListingRow[], mode: BrowseListingSort): void {
  switch (mode) {
    case "recommended":
      rows.sort((a, b) => {
        const at = a.boostedUntil?.getTime() ?? 0;
        const bt = b.boostedUntil?.getTime() ?? 0;
        if (at !== bt) return bt - at;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });
      break;
    case "nearest":
      rows.sort((a, b) => {
        const da = a.distanceMiles ?? 1e9;
        const db = b.distanceMiles ?? 1e9;
        if (da !== db) return da - db;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      break;
    case "price_asc":
      rows.sort(
        (a, b) =>
          browseSortPricePenceGbp(a) - browseSortPricePenceGbp(b) || b.createdAt.getTime() - a.createdAt.getTime()
      );
      break;
    case "price_desc":
      rows.sort(
        (a, b) =>
          browseSortPricePenceGbp(b) - browseSortPricePenceGbp(a) || b.createdAt.getTime() - a.createdAt.getTime()
      );
      break;
    case "newest":
      rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
    default:
      break;
  }
}

export function parseBrowseSort(raw: string | undefined, canNearest: boolean): BrowseListingSort {
  if (raw === "nearest" && canNearest) return "nearest";
  if (raw === "nearest" && !canNearest) return "recommended";
  if (raw === "price_asc" || raw === "price_desc" || raw === "newest") return raw;
  return "recommended";
}

/** All active listings with coordinates, distances from centre (no radius cap). */
async function fetchListingsAllWithDistance(
  base: Prisma.ListingWhereInput,
  centerLat: number,
  centerLng: number
): Promise<SearchListingRow[]> {
  const where: Prisma.ListingWhereInput = {
    ...base,
    lat: { not: null },
    lng: { not: null },
  };
  const candidates = await prisma.listing.findMany({
    where,
    include: searchListingInclude,
  });
  return candidates.map((l) => {
    const distanceMiles = haversineMiles(centerLat, centerLng, l.lat!, l.lng!);
    return { ...l, distanceMiles } as SearchListingRow;
  });
}

async function fetchListingsInRadiusBbox(
  base: Prisma.ListingWhereInput,
  centerLat: number,
  centerLng: number,
  radiusMiles: number
): Promise<SearchListingRow[]> {
  const bb = latLngBoundingBoxMiles(centerLat, centerLng, radiusMiles);
  const where: Prisma.ListingWhereInput = {
    ...base,
    lat: { not: null },
    lng: { not: null },
    AND: [
      { lat: { gte: bb.minLat, lte: bb.maxLat } },
      { lng: { gte: bb.minLng, lte: bb.maxLng } },
    ],
  };
  const candidates = await prisma.listing.findMany({
    where,
    include: searchListingInclude,
  });
  return candidates
    .map((l) => {
      const distanceMiles = haversineMiles(centerLat, centerLng, l.lat!, l.lng!);
      return { ...l, distanceMiles } as SearchListingRow;
    })
    .filter((l) => (l.distanceMiles ?? Infinity) <= radiusMiles);
}

function buildBaseWhere(
  params: Pick<
    ListingSearchParams,
    | "q"
    | "categoryId"
    | "condition"
    | "conditionGrade"
    | "sellerType"
    | "eraCsv"
    | "genreCsv"
    | "settingCsv"
    | "materialCsv"
    | "hireOnly"
    | "availableNow"
    | "listingType"
  >
): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { status: "active", visibleOnMarketplace: true };
  if (params.q?.trim()) {
    where.OR = [
      { title: { contains: params.q.trim(), mode: "insensitive" } },
      { description: { contains: params.q.trim(), mode: "insensitive" } },
    ];
  }
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.condition) where.condition = params.condition as Condition;
  if (params.conditionGrade) where.conditionGrade = params.conditionGrade as never;
  if (params.sellerType) {
    where.seller = { role: params.sellerType as "individual" | "reclamation_yard" | "dealer" };
  }
  const eras = (params.eraCsv ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const genres = (params.genreCsv ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const settings = (params.settingCsv ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const materials = (params.materialCsv ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (eras.length) where.eraTags = { hasSome: eras };
  if (genres.length) where.genreTags = { hasSome: genres };
  if (settings.length) {
    where.OR = [...(where.OR ?? []), { settingInteriorTags: { hasSome: settings } }, { settingExteriorTags: { hasSome: settings } }];
  }
  if (materials.length) where.propMaterials = { hasSome: materials };
  if (params.hireOnly) where.hireEnabled = true;
  if (params.availableNow) where.propListingStatus = "ACTIVE" as never;
  const lt = browseListingTypeQueryParam(params.listingType);
  if (lt === "auction") {
    where.listingKind = "auction";
  } else if (lt === "buy_now") {
    where.listingKind = "sell";
    where.freeToCollector = false;
  } else if (lt === "free_collect") {
    where.listingKind = "sell";
    where.freeToCollector = true;
  }
  return where;
}

function postcodePrefixWhere(postcode: string): Prisma.ListingWhereInput {
  const prefix = postcode.trim().toUpperCase().replace(/\s/g, "").slice(0, 4);
  if (prefix.length < 2) return {};
  return { postcode: { startsWith: prefix, mode: "insensitive" } };
}

export async function searchListings(params: ListingSearchParams): Promise<{
  listings: SearchListingRow[];
  total: number;
  sortByDistance: boolean;
  searchOriginPostcode: string | null;
  usingSavedHomeForDistance: boolean;
  distanceNotePostcode: string | null;
}> {
  const p: ListingSearchParams =
    params.sellerType === "reclamation_yard"
      ? { ...params, eraCsv: undefined, genreCsv: undefined, materialCsv: undefined }
      : params;

  const base = buildBaseWhere(p);
  const idList = p.idList?.filter(Boolean) ?? [];
  const postcodeRaw = p.postcode?.trim() ?? "";
  const origin = postcodeRaw ? await lookupUkPostcode(postcodeRaw) : null;

  const viewerRef =
    p.viewerHomeLat != null &&
    p.viewerHomeLng != null &&
    Number.isFinite(p.viewerHomeLat) &&
    Number.isFinite(p.viewerHomeLng)
      ? { lat: p.viewerHomeLat, lng: p.viewerHomeLng }
      : null;
  const distanceRef = origin ? { lat: origin.lat, lng: origin.lng } : viewerRef;
  const usingSavedHomeForDistance = !origin && !!viewerRef;
  const distanceNotePostcode =
    origin?.postcode ??
    (usingSavedHomeForDistance ? p.viewerHomePostcode?.trim() || null : null);

  const canNearest = !!origin || !!viewerRef;
  const effectiveSort = parseBrowseSort(p.sort, canNearest);

  function milesFromRef(l: { lat: number | null; lng: number | null }): number | null {
    if (!distanceRef || l.lat == null || l.lng == null) return null;
    return haversineMiles(distanceRef.lat, distanceRef.lng, l.lat, l.lng);
  }

  if (idList.length > 0) {
    const where: Prisma.ListingWhereInput = { ...base, id: { in: idList } };
    const [all, count] = await Promise.all([
      prisma.listing.findMany({ where, include: searchListingInclude }),
      prisma.listing.count({ where }),
    ]);
    const orderMap = new Map(idList.map((id, i) => [id, i]));
    all.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
    const withDist: SearchListingRow[] = all.map((l) => ({
      ...l,
      distanceMiles: milesFromRef(l),
    }));
    if (effectiveSort !== "recommended") {
      sortSearchRows(withDist, effectiveSort);
    }
    const pageSlice = withDist.slice(p.skip, p.skip + p.take);
    return {
      listings: pageSlice,
      total: count,
      sortByDistance: effectiveSort === "nearest",
      searchOriginPostcode: origin?.postcode ?? null,
      usingSavedHomeForDistance,
      distanceNotePostcode,
    };
  }

  if (origin) {
    const ranked = p.radiusNationwide
      ? await fetchListingsAllWithDistance(base, origin.lat, origin.lng)
      : await fetchListingsInRadiusBbox(base, origin.lat, origin.lng, p.radiusMiles);
    if (effectiveSort === "recommended" || effectiveSort === "nearest") {
      sortSearchRows(ranked, "nearest");
    } else {
      sortSearchRows(ranked, effectiveSort);
    }
    const sortByDistance = effectiveSort === "recommended" || effectiveSort === "nearest";
    const total = ranked.length;
    const listings = ranked.slice(p.skip, p.skip + p.take);
    return {
      listings,
      total,
      sortByDistance,
      searchOriginPostcode: origin.postcode,
      usingSavedHomeForDistance: false,
      distanceNotePostcode: origin.postcode,
    };
  }

  if (viewerRef && effectiveSort === "nearest") {
    const ranked = p.radiusNationwide
      ? await fetchListingsAllWithDistance(base, viewerRef.lat, viewerRef.lng)
      : await fetchListingsInRadiusBbox(base, viewerRef.lat, viewerRef.lng, p.radiusMiles);
    sortSearchRows(ranked, "nearest");
    const total = ranked.length;
    const listings = ranked.slice(p.skip, p.skip + p.take);
    return {
      listings,
      total,
      sortByDistance: true,
      searchOriginPostcode: null,
      usingSavedHomeForDistance: true,
      distanceNotePostcode: p.viewerHomePostcode?.trim() || null,
    };
  }

  const where: Prisma.ListingWhereInput = { ...base };
  if (postcodeRaw && !origin) {
    Object.assign(where, postcodePrefixWhere(postcodeRaw));
  }

  let orderBy: Prisma.ListingOrderByWithRelationInput[] = [
    { boostedUntil: "desc" },
    { updatedAt: "desc" },
  ];
  if (effectiveSort === "newest") {
    orderBy = [{ createdAt: "desc" }];
  } else if (effectiveSort === "price_asc") {
    orderBy = [{ price: "asc" }, { createdAt: "desc" }];
  } else if (effectiveSort === "price_desc") {
    orderBy = [{ price: "desc" }, { createdAt: "desc" }];
  }

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      skip: p.skip,
      take: p.take,
      include: searchListingInclude,
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    listings: listings.map((l) => ({ ...l, distanceMiles: milesFromRef(l) })),
    total,
    sortByDistance: false,
    searchOriginPostcode: null,
    usingSavedHomeForDistance,
    distanceNotePostcode,
  };
}
