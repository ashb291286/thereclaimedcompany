import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { getSiteBaseUrl } from "@/lib/site-url";

/** Notify users following this yard when a listing first becomes active + marketplace-visible. */
export async function notifyYardStockSubscribersForListing(listingId: string): Promise<void> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      sellerId: true,
      categoryId: true,
      title: true,
      status: true,
      visibleOnMarketplace: true,
    },
  });
  if (!listing || listing.status !== "active" || !listing.visibleOnMarketplace) return;

  const alerts = await prisma.yardStockAlert.findMany({
    where: {
      sellerId: listing.sellerId,
      OR: [{ categoryId: null }, { categoryId: listing.categoryId }],
    },
    select: { userId: true },
  });

  const base = getSiteBaseUrl();
  const linkUrl = `${base}/listings/${listingId}`;

  for (const a of alerts) {
    await createNotification({
      userId: a.userId,
      type: "yard_stock_alert",
      title: "New stock at a yard you follow",
      body: listing.title,
      linkUrl,
    });
  }
}
