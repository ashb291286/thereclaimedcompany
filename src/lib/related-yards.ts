import { prisma } from "@/lib/db";
import { haversineMiles } from "@/lib/geo";

export type RelatedYardCard = {
  slug: string;
  displayTitle: string;
  placeLine: string;
  postcode: string;
  logoUrl: string | null;
  distanceMiles: number | null;
};

/** Other reclamation yards: prefer distance when origin has coords, else same region / shared categories. */
export async function findRelatedYardProfiles(input: {
  excludeSlug: string;
  originLat: number | null;
  originLng: number | null;
  region: string | null;
  topCategoryIds: string[];
  take?: number;
}): Promise<RelatedYardCard[]> {
  const take = input.take ?? 12;
  const rows = await prisma.sellerProfile.findMany({
    where: {
      yardSlug: { not: null, notIn: [input.excludeSlug] },
      user: { role: "reclamation_yard" },
    },
    select: {
      yardSlug: true,
      businessName: true,
      displayName: true,
      postcode: true,
      postcodeLocality: true,
      adminDistrict: true,
      region: true,
      lat: true,
      lng: true,
      yardLogoUrl: true,
      user: {
        select: {
          listings: {
            where: { status: "active", visibleOnMarketplace: true },
            select: { categoryId: true },
            take: 30,
          },
        },
      },
    },
    take: 80,
  });

  type Row = (typeof rows)[number];
  const scored = rows.flatMap((p: Row) => {
    const slug = p.yardSlug;
    if (!slug) return [];
    const displayTitle = p.businessName?.trim() || p.displayName;
    const placeLine =
      [p.postcodeLocality, p.adminDistrict].filter(Boolean).join(", ") || p.region || "";
    let distanceMiles: number | null = null;
    if (
      input.originLat != null &&
      input.originLng != null &&
      p.lat != null &&
      p.lng != null
    ) {
      distanceMiles = haversineMiles(input.originLat, input.originLng, p.lat, p.lng);
    }

    const catIds = new Set(p.user.listings.map((l) => l.categoryId));
    let score = 0;
    if (distanceMiles != null) score += Math.max(0, 500 - distanceMiles * 5);
    if (input.region && p.region && p.region === input.region) score += 80;
    for (const c of input.topCategoryIds) {
      if (catIds.has(c)) score += 40;
    }

    const card: RelatedYardCard = {
      slug,
      displayTitle,
      placeLine,
      postcode: p.postcode,
      logoUrl: p.yardLogoUrl,
      distanceMiles,
    };
    return [{ card, score }];
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, take).map((s) => s.card);
}
