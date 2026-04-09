import { prisma } from "@/lib/db";

/** URL slug for an admin district (e.g. "York" → "york", "St Albans" → "st-albans"). */
export function slugifyAdminDistrict(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type YardAreaIndexRow = {
  slug: string;
  label: string;
  yardCount: number;
};

/**
 * Distinct admin districts that have at least one published reclamation yard (yard slug set).
 */
export async function getYardAreaIndex(): Promise<YardAreaIndexRow[]> {
  const profiles = await prisma.sellerProfile.findMany({
    where: {
      yardSlug: { not: null },
      adminDistrict: { not: null },
      user: { role: "reclamation_yard" },
    },
    select: { adminDistrict: true },
  });

  const counts = new Map<string, number>();
  for (const p of profiles) {
    const d = p.adminDistrict!.trim();
    if (!d) continue;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }

  const rows: YardAreaIndexRow[] = [];
  for (const [label, yardCount] of counts) {
    const slug = slugifyAdminDistrict(label);
    if (!slug) continue;
    rows.push({ slug, label, yardCount });
  }

  rows.sort((a, b) => a.label.localeCompare(b.label, "en-GB"));
  return rows;
}

export type YardInArea = {
  userId: string;
  displayName: string;
  businessName: string | null;
  yardSlug: string;
  postcode: string;
  adminDistrict: string | null;
  region: string | null;
  yardTagline: string | null;
};

export async function getYardsInAreaBySlug(areaSlug: string): Promise<{
  label: string | null;
  yards: YardInArea[];
}> {
  const normalized = areaSlug.trim().toLowerCase();
  if (!normalized) return { label: null, yards: [] };

  const profiles = await prisma.sellerProfile.findMany({
    where: {
      yardSlug: { not: null },
      adminDistrict: { not: null },
      user: { role: "reclamation_yard" },
    },
    select: {
      userId: true,
      displayName: true,
      businessName: true,
      yardSlug: true,
      postcode: true,
      adminDistrict: true,
      region: true,
      yardTagline: true,
    },
    orderBy: { displayName: "asc" },
  });

  const yards: YardInArea[] = [];
  let label: string | null = null;

  for (const p of profiles) {
    const d = p.adminDistrict!.trim();
    if (slugifyAdminDistrict(d) === normalized) {
      yards.push({
        userId: p.userId,
        displayName: p.displayName,
        businessName: p.businessName,
        yardSlug: p.yardSlug!,
        postcode: p.postcode,
        adminDistrict: p.adminDistrict,
        region: p.region,
        yardTagline: p.yardTagline,
      });
      if (!label) label = d;
    }
  }

  return { label, yards };
}

export async function getAllYardAreaSlugs(): Promise<string[]> {
  const index = await getYardAreaIndex();
  return index.map((r) => r.slug);
}
