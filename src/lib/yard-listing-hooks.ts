import { prisma } from "@/lib/db";
import { revalidateYardPublicPaths } from "@/lib/revalidate-yard";
import { trySendListingLiveEmail } from "@/lib/email/send-listing-live-email";
import { notifyYardStockSubscribersForListing } from "@/lib/yard-stock-alerts-notify";

export async function revalidateYardForSellerId(sellerId: string): Promise<void> {
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: sellerId },
    select: { yardSlug: true },
  });
  revalidateYardPublicPaths(profile?.yardSlug ?? null);
}

/**
 * After listing create/update: refresh yard cache; optionally notify stock-alert subscribers
 * when the listing has just become live on the marketplace.
 */
export async function afterMarketplaceListingPersisted(
  sellerId: string,
  listingId: string,
  options: { wasLive: boolean }
): Promise<void> {
  await revalidateYardForSellerId(sellerId);

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { status: true, visibleOnMarketplace: true },
  });
  const isLive = listing?.status === "active" && Boolean(listing.visibleOnMarketplace);
  if (isLive && !options.wasLive) {
    await notifyYardStockSubscribersForListing(listingId);
    await trySendListingLiveEmail(listingId, sellerId);
  }
}
