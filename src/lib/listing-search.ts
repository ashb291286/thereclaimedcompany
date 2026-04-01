import { prisma } from "@/lib/db";
import type { Condition, Prisma } from "@/generated/prisma/client";
import { haversineMiles, latLngBoundingBoxMiles } from "@/lib/geo";
import { lookupUkPostcode } from "@/lib/postcode-uk";

export type SearchListingRow = Prisma.ListingGetPayload<{ include: { category: true } }> & {
  distanceMiles: number | null;
};

export type ListingSearchParams = {
  q?: string;
  categoryId?: string;
  condition?: string;
  sellerType?: string;
  postcode?: string;
  radiusMiles: number;
  idList?: string[];
  skip: number;
  take: number;
};

function buildBaseWhere(
  params: Pick<ListingSearchParams, "q" | "categoryId" | "condition" | "sellerType">
): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = { status: "active" };
  if (params.q?.trim()) {
    where.OR = [
      { title: { contains: params.q.trim(), mode: "insensitive" } },
      { description: { contains: params.q.trim(), mode: "insensitive" } },
    ];
  }
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.condition) where.condition = params.condition as Condition;
  if (params.sellerType) {
    where.seller = { role: params.sellerType as "individual" | "reclamation_yard" };
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
}> {
  const base = buildBaseWhere(params);
  const idList = params.idList?.filter(Boolean) ?? [];
  const postcodeRaw = params.postcode?.trim() ?? "";
  const origin = postcodeRaw ? await lookupUkPostcode(postcodeRaw) : null;

  if (idList.length > 0) {
    const where: Prisma.ListingWhereInput = { ...base, id: { in: idList } };
    const [all, count] = await Promise.all([
      prisma.listing.findMany({ where, include: { category: true } }),
      prisma.listing.count({ where }),
    ]);
    const orderMap = new Map(idList.map((id, i) => [id, i]));
    all.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
    const withDist: SearchListingRow[] = all.map((l) => ({
      ...l,
      distanceMiles:
        origin && l.lat != null && l.lng != null
          ? haversineMiles(origin.lat, origin.lng, l.lat, l.lng)
          : null,
    }));
    const pageSlice = withDist.slice(params.skip, params.skip + params.take);
    return {
      listings: pageSlice,
      total: count,
      sortByDistance: false,
      searchOriginPostcode: origin?.postcode ?? null,
    };
  }

  if (origin) {
    const bb = latLngBoundingBoxMiles(origin.lat, origin.lng, params.radiusMiles);
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
      include: { category: true },
    });

    const ranked = candidates
      .map((l) => {
        const distanceMiles = haversineMiles(origin.lat, origin.lng, l.lat!, l.lng!);
        return { ...l, distanceMiles } as SearchListingRow;
      })
      .filter((l) => (l.distanceMiles ?? Infinity) <= params.radiusMiles)
      .sort((a, b) => {
        const da = a.distanceMiles ?? 0;
        const db = b.distanceMiles ?? 0;
        if (da !== db) return da - db;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

    const total = ranked.length;
    const listings = ranked.slice(params.skip, params.skip + params.take);
    return {
      listings,
      total,
      sortByDistance: true,
      searchOriginPostcode: origin.postcode,
    };
  }

  const where: Prisma.ListingWhereInput = { ...base };
  if (postcodeRaw && !origin) {
    Object.assign(where, postcodePrefixWhere(postcodeRaw));
  }

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
      include: { category: true },
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    listings: listings.map((l) => ({ ...l, distanceMiles: null as number | null })),
    total,
    sortByDistance: false,
    searchOriginPostcode: null,
  };
}
