import type { PrismaClient } from "@/generated/prisma/client";

/** URL-safe slug for /yards/[slug] (legacy /reclamation-yard/:slug redirects). */
export function slugifyYard(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return s || "reclamation-yard";
}

/**
 * Picks a unique yardSlug for this user (allows reuse of own slug when editing).
 */
export async function allocateYardSlug(
  db: PrismaClient,
  baseRaw: string,
  ownerUserId: string
): Promise<string> {
  const base = slugifyYard(baseRaw);
  for (let n = 0; n < 80; n++) {
    const candidate = n === 0 ? base : `${base}-${n}`;
    const existing = await db.sellerProfile.findFirst({
      where: { yardSlug: candidate },
      select: { userId: true },
    });
    if (!existing || existing.userId === ownerUserId) {
      return candidate;
    }
  }
  return `${base}-${ownerUserId.slice(-8)}`;
}

/** Normalizes user-entered slug and checks uniqueness (excluding owner). */
export async function resolveYardSlugForUpdate(
  db: PrismaClient,
  raw: string,
  ownerUserId: string
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const slug = slugifyYard(raw);
  if (!slug || slug.length < 2) {
    return { ok: false, error: "Choose a URL slug at least 2 characters (letters and numbers)." };
  }
  const existing = await db.sellerProfile.findFirst({
    where: { yardSlug: slug },
    select: { userId: true },
  });
  if (existing && existing.userId !== ownerUserId) {
    return { ok: false, error: "That URL is already taken. Try a different slug." };
  }
  return { ok: true, slug };
}
