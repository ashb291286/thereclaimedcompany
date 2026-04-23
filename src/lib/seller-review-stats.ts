import { prisma } from "@/lib/db";

export type SellerReviewStats = { avg: number; count: number };

/**
 * Aggregates buyer→seller review ratings (Order.buyerReviewRating) per seller.
 */
export async function getSellerReviewStatsBySellerIds(
  sellerIds: string[]
): Promise<Map<string, SellerReviewStats>> {
  const unique = [...new Set(sellerIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const groups = await prisma.order.groupBy({
    by: ["sellerId"],
    where: {
      sellerId: { in: unique },
      buyerReviewRating: { not: null },
    },
    _avg: { buyerReviewRating: true },
    _count: { buyerReviewRating: true },
  });

  const m = new Map<string, SellerReviewStats>();
  for (const g of groups) {
    const avg = g._avg.buyerReviewRating;
    const count = g._count.buyerReviewRating;
    if (avg == null || count === 0) continue;
    m.set(g.sellerId, { avg, count });
  }
  return m;
}
