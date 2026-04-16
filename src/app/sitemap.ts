import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { getSiteBaseUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteBaseUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/search`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${base}/categories`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/dealers`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/reclamation-yards`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/wanted`, lastModified: now, changeFrequency: "daily", priority: 0.75 },
  ];

  try {
    const [listings, categories, yards, blogPosts] = await Promise.all([
      prisma.listing.findMany({
        where: { status: "active", visibleOnMarketplace: true },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5000,
      }),
      prisma.category.findMany({
        where: { parentId: null },
        select: { slug: true },
      }),
      prisma.sellerProfile.findMany({
        where: { yardSlug: { not: null }, user: { role: "reclamation_yard" } },
        select: { yardSlug: true, updatedAt: true },
        take: 3000,
      }),
      prisma.blogPost.findMany({
        where: { published: true },
        select: { slug: true, publishedAt: true, updatedAt: true },
        orderBy: { publishedAt: "desc" },
        take: 3000,
      }),
    ]);

    const listingRoutes: MetadataRoute.Sitemap = listings.map((l) => ({
      url: `${base}/listings/${l.id}`,
      lastModified: l.updatedAt,
      changeFrequency: "daily",
      priority: 0.8,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${base}/categories/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    const yardRoutes: MetadataRoute.Sitemap = yards
      .filter((y) => Boolean(y.yardSlug))
      .map((y) => ({
        url: `${base}/yards/${y.yardSlug!}`,
        lastModified: y.updatedAt,
        changeFrequency: "daily",
        priority: 0.75,
      }));

    const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updatedAt ?? p.publishedAt ?? now,
      changeFrequency: "monthly",
      priority: 0.65,
    }));

    return [...staticRoutes, ...categoryRoutes, ...yardRoutes, ...blogRoutes, ...listingRoutes];
  } catch {
    return staticRoutes;
  }
}
