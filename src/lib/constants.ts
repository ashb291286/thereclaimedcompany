import type { Condition, ListingKind } from "@/generated/prisma/client";

export const CONDITION_LABELS: Record<Condition, string> = {
  like_new: "Like new",
  used: "Used",
  worn: "Worn",
  parts_not_working: "Parts / not working",
  refurbished: "Refurbished",
  upcycled: "Upcycled",
  collectable: "Collectable",
};

export const LISTING_KIND_LABELS: Record<ListingKind, string> = {
  sell: "Fixed price (sell)",
  auction: "Auction",
};

/** Stripe GBP minimum for card checkout (pence). */
export const STRIPE_MIN_AMOUNT_PENCE = 30;
