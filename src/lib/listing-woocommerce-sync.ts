import { prisma } from "@/lib/db";
import { getSiteBaseUrl } from "@/lib/site-url";
import {
  isWooCommerceConfigured,
  wooCommerceCreateProduct,
  wooCommerceDeleteProduct,
  wooCommerceUpdateProduct,
  type WooExternalProductPayload,
} from "@/lib/woocommerce-rest";
import { ListingStatus, ListingKind } from "@/generated/prisma/client";

function plainTextExcerpt(html: string, maxLen: number): string {
  const t = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length <= maxLen ? t : `${t.slice(0, maxLen - 1)}…`;
}

function listingDetailUrl(listingId: string): string {
  return `${getSiteBaseUrl()}/listings/${listingId}`;
}

function buildPayload(
  listing: {
    id: string;
    title: string;
    description: string;
    price: number;
    listingKind: ListingKind;
    images: string[];
  },
  wooCategoryId: number
): WooExternalProductPayload {
  const url = listingDetailUrl(listing.id);
  const priceGbp = Math.max(0, listing.price) / 100;
  const priceStr = priceGbp.toFixed(2);
  const shortDesc = plainTextExcerpt(listing.description, 280);
  const images =
    listing.images[0]?.startsWith("http") ? [{ src: listing.images[0] }] : [];

  const buttonText =
    listing.listingKind === "auction" ? "View auction" : "View on marketplace";

  return {
    name: listing.title.slice(0, 200),
    type: "external",
    status: "publish",
    description: `<p>${plainTextExcerpt(listing.description, 8000)}</p>`,
    short_description: `<p>${shortDesc}</p>`,
    external_url: url,
    button_text: buttonText,
    regular_price: priceStr,
    categories: [{ id: wooCategoryId }],
    images,
  };
}

/**
 * Creates, updates, or removes a WooCommerce external product for this listing
 * when the category is configured for sync and credentials are set.
 */
export async function syncListingToWooCommerce(listingId: string): Promise<void> {
  if (!isWooCommerceConfigured()) {
    return;
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { category: true },
  });

  if (!listing) return;

  const eligible =
    listing.status === ListingStatus.active &&
    listing.visibleOnMarketplace &&
    listing.category.wooCommerceSyncEnabled &&
    listing.category.wooCommerceCategoryId != null;

  const wcCatId = listing.category.wooCommerceCategoryId!;

  const clearError = { wooCommerceLastError: null as string | null };

  try {
    if (!eligible) {
      if (listing.wooCommerceProductId != null) {
        await wooCommerceDeleteProduct(listing.wooCommerceProductId);
        await prisma.listing.update({
          where: { id: listingId },
          data: {
            wooCommerceProductId: null,
            wooCommerceSyncedAt: null,
            ...clearError,
          },
        });
      }
      return;
    }

    const body = buildPayload(listing, wcCatId);

    if (listing.wooCommerceProductId != null) {
      await wooCommerceUpdateProduct(listing.wooCommerceProductId, body);
      await prisma.listing.update({
        where: { id: listingId },
        data: {
          wooCommerceSyncedAt: new Date(),
          ...clearError,
        },
      });
      return;
    }

    const { id: wcId } = await wooCommerceCreateProduct(body);
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        wooCommerceProductId: wcId,
        wooCommerceSyncedAt: new Date(),
        ...clearError,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        wooCommerceLastError: msg.slice(0, 2000),
      },
    });
  }
}
