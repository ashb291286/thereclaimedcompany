import { prisma } from "@/lib/db";

export function slugifyDealerArea(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type DealerAreaIndexRow = {
  slug: string;
  label: string;
  dealerCount: number;
};

export async function getDealerAreaIndex(): Promise<DealerAreaIndexRow[]> {
  const profiles = await prisma.sellerProfile.findMany({
    where: {
      adminDistrict: { not: null },
      user: { role: "dealer" },
    },
    select: { adminDistrict: true },
  });

  const counts = new Map<string, number>();
  for (const p of profiles) {
    const d = p.adminDistrict!.trim();
    if (!d) continue;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }

  const rows: DealerAreaIndexRow[] = [];
  for (const [label, dealerCount] of counts) {
    const slug = slugifyDealerArea(label);
    if (!slug) continue;
    rows.push({ slug, label, dealerCount });
  }
  rows.sort((a, b) => a.label.localeCompare(b.label, "en-GB"));
  return rows;
}

export type DealerInArea = {
  userId: string;
  displayName: string;
  businessName: string | null;
  postcode: string;
  adminDistrict: string | null;
  region: string | null;
  postcodeLocality: string | null;
  yardTagline: string | null;
};

export async function getDealersInAreaBySlug(areaSlug: string): Promise<{
  label: string | null;
  dealers: DealerInArea[];
}> {
  const normalized = areaSlug.trim().toLowerCase();
  if (!normalized) return { label: null, dealers: [] };

  const profiles = await prisma.sellerProfile.findMany({
    where: {
      adminDistrict: { not: null },
      user: { role: "dealer" },
    },
    select: {
      userId: true,
      displayName: true,
      businessName: true,
      postcode: true,
      adminDistrict: true,
      region: true,
      postcodeLocality: true,
      yardTagline: true,
    },
    orderBy: { displayName: "asc" },
  });

  const dealers: DealerInArea[] = [];
  let label: string | null = null;
  for (const p of profiles) {
    const d = p.adminDistrict!.trim();
    if (slugifyDealerArea(d) === normalized) {
      dealers.push({
        userId: p.userId,
        displayName: p.displayName,
        businessName: p.businessName,
        postcode: p.postcode,
        adminDistrict: p.adminDistrict,
        region: p.region,
        postcodeLocality: p.postcodeLocality,
        yardTagline: p.yardTagline,
      });
      if (!label) label = d;
    }
  }

  return { label, dealers };
}

export async function getAllDealerAreaSlugs(): Promise<string[]> {
  const index = await getDealerAreaIndex();
  return index.map((r) => r.slug);
}
