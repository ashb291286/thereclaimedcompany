/**
 * Mirrors Prisma listing enums without importing `@/generated/prisma/client`
 * (Prisma pulls `node:*` and breaks Turbopack client bundles).
 */

export type Condition =
  | "like_new"
  | "used"
  | "worn"
  | "parts_not_working"
  | "refurbished"
  | "upcycled"
  | "collectable";

export type ListingKind = "sell" | "auction";

export const ListingPricingMode = {
  LOT: "LOT",
  PER_UNIT: "PER_UNIT",
} as const;

export type ListingPricingMode = (typeof ListingPricingMode)[keyof typeof ListingPricingMode];
