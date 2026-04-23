import { CONDITION_LABELS } from "@/lib/constants";
import { parseStoredCarbonImpact } from "@/lib/carbon/stored-impact";
import { formatMiles } from "@/lib/geo";
import type { SearchListingRow } from "@/lib/listing-search";
import { proxiedListingImageSrc } from "@/lib/listing-image-url";
import { publicSellerPath } from "@/lib/yard-public-path";
import { buyerGrossPenceFromSellerNetPence, sellerChargesVat, vatLabelSuffix } from "@/lib/vat-pricing";

/** Server rows use `Date`; `/api/listings` JSON uses ISO strings for `auctionEndsAt`. */
export type SearchListingRowReelInput = Omit<SearchListingRow, "auctionEndsAt"> & {
  auctionEndsAt: SearchListingRow["auctionEndsAt"] | string;
};

const FALLBACK_AVATAR = "/images/dealer-fallback.png";

export type ReelListing = {
  id: string;
  title: string;
  imageUrl: string | null;
  auctionEndsAtIso: string | null;
  buyerPenceGbp: number;
  vatSuffix: string;
  freeToCollectPrice: boolean;
  categoryName: string;
  conditionLabel: string;
  listingKind: "sell" | "auction";
  freeToCollector: boolean;
  offersDelivery: boolean;
  distanceLabel: string | null;
  carbonSavedKg: number | null;
  sellerDisplayName: string;
  sellerAvatarUrl: string;
  sellerProfileHref: string;
  sellerReviewAvg: number | null;
  sellerReviewCount: number;
};

export function searchListingRowToReel(l: SearchListingRowReelInput): ReelListing {
  const carbon = parseStoredCarbonImpact(l);
  const v = sellerChargesVat({
    sellerRole: l.seller.role,
    vatRegistered: l.seller.sellerProfile?.vatRegistered,
  });
  const buyerPence = buyerGrossPenceFromSellerNetPence(l.price, v);
  const vatBit = vatLabelSuffix(v);
  const sp = l.seller.sellerProfile;
  const name = (sp?.businessName?.trim() || sp?.displayName?.trim() || "Seller") as string;
  const avatar =
    sp?.yardLogoUrl?.trim() ||
    (l.seller.role === "individual" && l.seller.image?.trim() ? l.seller.image : null) ||
    sp?.yardHeaderImageUrl?.trim() ||
    FALLBACK_AVATAR;
  const sellerHref = publicSellerPath({
    sellerId: l.sellerId,
    role: l.seller.role,
    yardSlug: sp?.yardSlug,
  });
  const rawEnds = l.auctionEndsAt;
  const auctionEndsAtIso =
    rawEnds == null
      ? null
      : typeof rawEnds === "string"
        ? (() => {
            const d = new Date(rawEnds);
            return Number.isNaN(d.getTime()) ? null : d.toISOString();
          })()
        : rawEnds.toISOString();

  return {
    id: l.id,
    title: l.title,
    imageUrl: l.images[0] ? proxiedListingImageSrc(l.images[0]) : null,
    auctionEndsAtIso,
    buyerPenceGbp: buyerPence,
    vatSuffix: vatBit,
    freeToCollectPrice: l.listingKind === "sell" && l.freeToCollector,
    categoryName: l.category.name,
    conditionLabel: CONDITION_LABELS[l.condition],
    listingKind: l.listingKind,
    freeToCollector: l.freeToCollector,
    offersDelivery: l.offersDelivery,
    distanceLabel: l.distanceMiles != null ? formatMiles(l.distanceMiles) : null,
    carbonSavedKg: carbon?.carbon_saved_kg ?? null,
    sellerDisplayName: name,
    sellerAvatarUrl: avatar,
    sellerProfileHref: sellerHref,
    sellerReviewAvg: l.sellerReviewAvg,
    sellerReviewCount: l.sellerReviewCount,
  };
}
