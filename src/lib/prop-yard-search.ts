import { prisma } from "@/lib/db";
import type { Condition, Prisma } from "@/generated/prisma/client";
import { CONDITION_LABELS } from "@/lib/constants";

const CONDITION_VALUES = new Set(Object.keys(CONDITION_LABELS) as Condition[]);

export type PropYardSearchFilters = {
  q: string;
  eraTags: string[];
  genreTags: string[];
  styleTags: string[];
  settingInteriorTags: string[];
  settingExteriorTags: string[];
  /** Legacy `setting` query: match if any tag appears on interior or exterior lists. */
  legacySettingOrTags: string[];
  categoryNames: string[];
  geographicOrigin: string | null;
  condition: Condition | null;
  availableNow: boolean;
};

export function normalizeStringList(v: string | string[] | undefined): string[] {
  if (v == null) return [];
  const parts = Array.isArray(v) ? v : [v];
  const out: string[] = [];
  for (const p of parts) {
    for (const x of String(p).split(",")) {
      const t = x.trim();
      if (t) out.push(t);
    }
  }
  return [...new Set(out)];
}

export function parsePropYardSearchFromParams(params: Record<string, string | string[] | undefined>): PropYardSearchFilters {
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const conditionRaw = typeof params.condition === "string" ? params.condition.trim() : "";
  const condition = CONDITION_VALUES.has(conditionRaw as Condition) ? (conditionRaw as Condition) : null;
  const geographicOrigin =
    typeof params.geographicOrigin === "string" && params.geographicOrigin.trim()
      ? params.geographicOrigin.trim()
      : null;
  const availableNow = params.availableNow === "1" || params.availableNow === "true";

  const settingInteriorTags = normalizeStringList(params.settingInterior);
  const settingExteriorTags = normalizeStringList(params.settingExterior);
  const legacySettingOrTags =
    settingInteriorTags.length || settingExteriorTags.length
      ? []
      : normalizeStringList(params.setting);

  return {
    q,
    eraTags: normalizeStringList(params.era),
    genreTags: normalizeStringList(params.genre),
    styleTags: normalizeStringList(params.style),
    settingInteriorTags,
    settingExteriorTags,
    legacySettingOrTags,
    categoryNames: normalizeStringList(params.category),
    geographicOrigin,
    condition,
    availableNow,
  };
}

export type PropYardOfferSearchRow = Awaited<ReturnType<typeof searchPropYardOffers>>[number];

export type PropYardOfferDto = {
  id: string;
  weeklyHirePence: number;
  minimumHireWeeks: number;
  listing: {
    id: string;
    title: string;
    images: string[];
    category: { name: string };
    seller: { sellerProfile: { displayName: string } | null };
  };
};

export function propOfferToDto(o: PropYardOfferSearchRow): PropYardOfferDto {
  return {
    id: o.id,
    weeklyHirePence: o.weeklyHirePence,
    minimumHireWeeks: o.minimumHireWeeks,
    listing: {
      id: o.listing.id,
      title: o.listing.title,
      images: o.listing.images,
      category: { name: o.listing.category.name },
      seller: {
        sellerProfile: o.listing.seller.sellerProfile
          ? { displayName: o.listing.seller.sellerProfile.displayName }
          : null,
      },
    },
  };
}

export async function searchPropYardOffers(filters: PropYardSearchFilters, take = 72) {
  const term = filters.q.trim();

  const listingAnd: Prisma.ListingWhereInput[] = [];

  if (term) {
    listingAnd.push({
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  if (filters.legacySettingOrTags.length) {
    listingAnd.push({
      OR: [
        { settingInteriorTags: { hasSome: filters.legacySettingOrTags } },
        { settingExteriorTags: { hasSome: filters.legacySettingOrTags } },
      ],
    });
  }

  const listingWhere: Prisma.ListingWhereInput = {
    status: "active",
    listingKind: "sell",
    freeToCollector: false,
    ...(filters.condition ? { condition: filters.condition } : {}),
    ...(filters.availableNow ? { propListingStatus: "ACTIVE" } : {}),
    ...(filters.eraTags.length ? { eraTags: { hasSome: filters.eraTags } } : {}),
    ...(filters.genreTags.length ? { genreTags: { hasSome: filters.genreTags } } : {}),
    ...(filters.styleTags.length ? { styleTags: { hasSome: filters.styleTags } } : {}),
    ...(filters.settingInteriorTags.length
      ? { settingInteriorTags: { hasSome: filters.settingInteriorTags } }
      : {}),
    ...(filters.settingExteriorTags.length
      ? { settingExteriorTags: { hasSome: filters.settingExteriorTags } }
      : {}),
    ...(filters.categoryNames.length ? { category: { name: { in: filters.categoryNames } } } : {}),
    ...(filters.geographicOrigin ? { geographicOrigin: filters.geographicOrigin } : {}),
    ...(listingAnd.length ? { AND: listingAnd } : {}),
  };

  return prisma.propRentalOffer.findMany({
    where: {
      isActive: true,
      listing: listingWhere,
    },
    orderBy: { updatedAt: "desc" },
    take,
    include: {
      listing: {
        include: {
          category: true,
          seller: { include: { sellerProfile: true } },
        },
      },
    },
  });
}
