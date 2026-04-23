import type { UserRole } from "@/generated/prisma/client";

export type SellerBadgeVM = {
  /** Stable key for React */
  key: string;
  label: string;
  href: string;
  title: string;
};

const BROWSE_RECLAIMED = "/search";
const BROWSE_YARDS = "/reclamation-yards";

/**
 * Public “reclaimer” badges for the listing seller card. Each badge links into the reclaimed marketplace browse experience.
 */
export function buildSellerBadges(input: {
  paidSalesCount: number;
  activeListingsCount: number;
  role: UserRole | null;
  verificationStatus: string | null;
  memberSince: Date;
  isRegisteredCharity?: boolean;
}): SellerBadgeVM[] {
  const badges: SellerBadgeVM[] = [];

  const { paidSalesCount, activeListingsCount, role, verificationStatus, memberSince, isRegisteredCharity } = input;
  const isDealer = role === "dealer";
  const roleLabel = isDealer ? "dealer" : "reclaimer";

  let tier: SellerBadgeVM;
  if (paidSalesCount >= 25) {
    tier = {
      key: "tier",
      label: isDealer ? "Master dealer" : "Master reclaimer",
      href: BROWSE_RECLAIMED,
      title: "Browse reclaimed listings on the marketplace",
    };
  } else if (paidSalesCount >= 10) {
    tier = {
      key: "tier",
      label: isDealer ? "Trusted dealer" : "Trusted reclaimer",
      href: BROWSE_RECLAIMED,
      title: "Browse reclaimed materials and salvage",
    };
  } else if (paidSalesCount >= 3) {
    tier = {
      key: "tier",
      label: isDealer ? "Rising dealer" : "Rising reclaimer",
      href: BROWSE_RECLAIMED,
      title: "See what else is being reclaimed nearby",
    };
  } else if (paidSalesCount >= 1) {
    tier = {
      key: "tier",
      label: isDealer ? "Rookie dealer" : "Rookie reclaimer",
      href: BROWSE_RECLAIMED,
      title: "Explore more reclaimed listings",
    };
  } else {
    tier = {
      key: "tier",
      label: isDealer ? "New dealer" : "New reclaimer",
      href: BROWSE_RECLAIMED,
      title: "Discover reclaimed stock on the marketplace",
    };
  }
  badges.push(tier);

  if (role === "reclamation_yard") {
    badges.push({
      key: "yard",
      label: "Salvage yard",
      href: BROWSE_YARDS,
      title: "Find reclamation yards and yards selling reclaimed materials",
    });
  }
  if (isRegisteredCharity) {
    badges.push({
      key: "charity",
      label: "Charity Support",
      href: BROWSE_RECLAIMED,
      title: "Support registered charity sellers on the marketplace",
    });
  }

  if (verificationStatus === "verified") {
    badges.push({
      key: "verified",
      label: `Verified ${roleLabel}`,
      href: BROWSE_RECLAIMED,
      title: "Browse verified sellers and reclaimed listings",
    });
  }

  if (activeListingsCount >= 5) {
    badges.push({
      key: "active",
      label: "Active lister",
      href: BROWSE_RECLAIMED,
      title: "See live reclaimed listings",
    });
  }

  const daysMember = (Date.now() - memberSince.getTime()) / (24 * 60 * 60 * 1000);
  if (daysMember >= 365) {
    badges.push({
      key: "established",
      label: `Established ${roleLabel}`,
      href: BROWSE_RECLAIMED,
      title: "Explore the reclaimed marketplace",
    });
  }

  return badges.slice(0, 4);
}
