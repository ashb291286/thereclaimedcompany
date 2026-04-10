import type { SellerProfile } from "@/generated/prisma/client";
import { parseYardSocialJson } from "@/lib/yard-social";

type ProfileSlice = Pick<
  SellerProfile,
  | "displayName"
  | "businessName"
  | "postcode"
  | "yardSlug"
  | "yardTagline"
  | "yardAbout"
  | "yardLogoUrl"
  | "yardHeaderImageUrl"
  | "yardContactEmail"
  | "yardContactPhone"
  | "yardWebsiteUrl"
  | "openingHoursSchedule"
  | "yardPrimaryMaterials"
  | "yardServiceAreas"
  | "yardWhatsApp"
  | "yearEstablished"
  | "yardTradePublic"
  | "yardResponseTimeNote"
  | "yardSocialJson"
  | "yardDeliveryOptionsJson"
>;

export function yardProfileCompletenessPercent(profile: ProfileSlice): number {
  const social = parseYardSocialJson(profile.yardSocialJson);
  const checks = [
    Boolean(profile.displayName?.trim()),
    Boolean(profile.businessName?.trim()),
    Boolean(profile.postcode?.trim()),
    Boolean(profile.yardSlug?.trim()),
    Boolean(profile.yardTagline?.trim()),
    (profile.yardAbout?.trim().length ?? 0) >= 150,
    Boolean(profile.yardLogoUrl?.trim()),
    Boolean(profile.yardHeaderImageUrl?.trim()),
    Boolean(profile.yardContactEmail?.trim() || profile.yardContactPhone?.trim()),
    Boolean(profile.yardWebsiteUrl?.trim()),
    profile.openingHoursSchedule != null,
    (profile.yardPrimaryMaterials?.length ?? 0) > 0,
    Boolean(profile.yardServiceAreas?.trim()),
    Boolean(profile.yardWhatsApp?.trim()),
    profile.yearEstablished != null && profile.yearEstablished > 1800,
    Boolean(profile.yardTradePublic?.trim()),
    Boolean(profile.yardResponseTimeNote?.trim()),
    Object.values(social).some((u) => Boolean(u?.trim())),
    profile.yardDeliveryOptionsJson != null,
  ];
  const hit = checks.filter(Boolean).length;
  return Math.round((hit / checks.length) * 100);
}
