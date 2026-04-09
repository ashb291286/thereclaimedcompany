import { prisma } from "@/lib/db";
import type { Condition, Prisma } from "@/generated/prisma/client";
import { haversineMiles, latLngBoundingBoxMiles } from "@/lib/geo";
import { lookupUkPostcode } from "@/lib/postcode-uk";

const searchListingInclude = {
  category: true,
  seller: { select: { role: true, sellerProfile: { select: { vatRegistered: true } } } },
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
  radiusMiles: number;
  idList?: string[];
  skip: number;
  take: number;
  /** Signed-in buyer’s saved home (used for distance when search postcode is empty). */
  viewerHomeLat?: number | null;
  viewerHomeLng?: number | null;
  viewerHomePostcode?: string | null;
};

function buildBaseWhere(
  params: Pick<ListingSearchParams, "q" | "categoryId" | "condition" | "conditionGrade" | "sellerType" | "eraCsv" | "genreCsv" | "settingCsv" | "materialCsv" | "hireOnly" | "availableNow">
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
    where.seller = { role: params.sellerType as "individual" | "reclamation_yard" };
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
    const pageSlice = withDist.slice(p.skip, p.skip + p.take);
    return {
      listings: pageSlice,
      total: count,
      sortByDistance: false,
      searchOriginPostcode: origin?.postcode ?? null,
      usingSavedHomeForDistance,
      distanceNotePostcode,
    };
  }

  if (origin) {
    const bb = latLngBoundingBoxMiles(origin.lat, origin.lng, p.radiusMiles);
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

    const ranked = candidates
      .map((l) => {
        const distanceMiles = haversineMiles(origin.lat, origin.lng, l.lat!, l.lng!);
        return { ...l, distanceMiles } as SearchListingRow;
      })
      .filter((l) => (l.distanceMiles ?? Infinity) <= p.radiusMiles)
      .sort((a, b) => {
        const da = a.distanceMiles ?? 0;
        const db = b.distanceMiles ?? 0;
        if (da !== db) return da - db;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

    const total = ranked.length;
    const listings = ranked.slice(p.skip, p.skip + p.take);
    return {
      listings,
      total,
      sortByDistance: true,
      searchOriginPostcode: origin.postcode,
      usingSavedHomeForDistance: false,
      distanceNotePostcode: origin.postcode,
    };
  }

  const where: Prisma.ListingWhereInput = { ...base };
  if (postcodeRaw && !origin) {
    Object.assign(where, postcodePrefixWhere(postcodeRaw));
  }

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: [{ boostedUntil: "desc" }, { updatedAt: "desc" }],
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
