import { prisma } from "@/lib/db";

export type MarketplaceFeeSettingsSnapshot = {
  commissionPercentBps: number;
  commissionFixedPence: number;
  commissionVatRateBps: number;
  stripeFeePercentBps: number;
  stripeFeeFixedPence: number;
  digitalMarketplaceFeeBps: number;
  digitalMarketplaceFeeFixedPence: number;
};

const DEFAULT_SETTINGS: MarketplaceFeeSettingsSnapshot = {
  commissionPercentBps: 1000,
  commissionFixedPence: 20,
  commissionVatRateBps: 2000,
  stripeFeePercentBps: 150,
  stripeFeeFixedPence: 20,
  digitalMarketplaceFeeBps: 0,
  digitalMarketplaceFeeFixedPence: 0,
};

export async function getMarketplaceFeeSettings(): Promise<MarketplaceFeeSettingsSnapshot> {
  const row = await prisma.marketplaceFeeSettings.findUnique({ where: { id: "default" } });
  if (!row) return DEFAULT_SETTINGS;
  return {
    commissionPercentBps: row.commissionPercentBps,
    commissionFixedPence: row.commissionFixedPence,
    commissionVatRateBps: row.commissionVatRateBps,
    stripeFeePercentBps: row.stripeFeePercentBps,
    stripeFeeFixedPence: row.stripeFeeFixedPence,
    digitalMarketplaceFeeBps: row.digitalMarketplaceFeeBps,
    digitalMarketplaceFeeFixedPence: row.digitalMarketplaceFeeFixedPence,
  };
}

export function calculateMarketplaceFees(
  grossAmountPence: number,
  settings: MarketplaceFeeSettingsSnapshot
) {
  const commissionNetPence = Math.max(
    0,
    Math.round((grossAmountPence * settings.commissionPercentBps) / 10000) +
      settings.commissionFixedPence
  );
  const commissionVatPence = Math.max(
    0,
    Math.round((commissionNetPence * settings.commissionVatRateBps) / 10000)
  );
  const commissionGrossPence = commissionNetPence + commissionVatPence;
  const stripeProcessingFeePence = Math.max(
    0,
    Math.round((grossAmountPence * settings.stripeFeePercentBps) / 10000) +
      settings.stripeFeeFixedPence
  );
  const digitalMarketplaceFeePence = Math.max(
    0,
    Math.round((grossAmountPence * settings.digitalMarketplaceFeeBps) / 10000) +
      settings.digitalMarketplaceFeeFixedPence
  );
  const totalMarketplaceFeesPence =
    commissionGrossPence + stripeProcessingFeePence + digitalMarketplaceFeePence;
  const sellerPayoutPence = Math.max(0, grossAmountPence - totalMarketplaceFeesPence);
  return {
    grossAmountPence,
    commissionNetPence,
    commissionVatPence,
    commissionGrossPence,
    stripeProcessingFeePence,
    digitalMarketplaceFeePence,
    totalMarketplaceFeesPence,
    sellerPayoutPence,
    commissionPercentBps: settings.commissionPercentBps,
    commissionFixedPence: settings.commissionFixedPence,
    commissionVatRateBps: settings.commissionVatRateBps,
    stripeFeePercentBps: settings.stripeFeePercentBps,
    stripeFeeFixedPence: settings.stripeFeeFixedPence,
    digitalMarketplaceFeeBps: settings.digitalMarketplaceFeeBps,
    digitalMarketplaceFeeFixedPence: settings.digitalMarketplaceFeeFixedPence,
  };
}

export function invoiceNumberForOrder(orderId: string): string {
  return `RM-${orderId.slice(0, 10).toUpperCase()}`;
}
