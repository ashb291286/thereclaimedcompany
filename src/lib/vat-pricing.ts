import type { UserRole } from "@/generated/prisma/client";

export const UK_VAT_FACTOR = 1.2;

export function sellerChargesVat(opts: {
  sellerRole: UserRole | null | undefined;
  vatRegistered: boolean | null | undefined;
}): boolean {
  return opts.sellerRole === "reclamation_yard" && Boolean(opts.vatRegistered);
}

/** Stored / seller-facing net pence → amount buyer pays (gross) when VAT applies. */
export function buyerGrossPenceFromSellerNetPence(netPence: number, chargesVat: boolean): number {
  if (!chargesVat || netPence <= 0) return netPence;
  return Math.round(netPence * UK_VAT_FACTOR);
}

/** Buyer-entered total (gross) → net pence to store when VAT applies. */
export function sellerNetPenceFromBuyerGrossPence(grossPence: number): number {
  if (grossPence <= 0) return 0;
  return Math.round(grossPence / UK_VAT_FACTOR);
}

export function vatLabelSuffix(chargesVat: boolean): string {
  return chargesVat ? " (incl. VAT)" : "";
}

export function sellerPriceHint(chargesVat: boolean): string {
  return chargesVat
    ? "Prices you enter exclude VAT. Buyers pay 20% UK VAT at checkout; we show them the total."
    : "";
}
