import { prisma } from "@/lib/db";

/** Resolve a browse filter value as either a Category id or slug (URL-friendly). */
export async function resolveCategoryBrowseRow(
  raw: string | null | undefined
): Promise<{ id: string; slug: string; name: string } | null> {
  if (!raw?.trim()) return null;
  const v = raw.trim();
  return prisma.category.findFirst({
    where: { OR: [{ id: v }, { slug: v }] },
    select: { id: true, slug: true, name: true },
  });
}
