/** Display-only currencies (checkout stays GBP / Stripe). */
export type DisplayCurrencyCode = "GBP" | "USD" | "EUR";

export const DISPLAY_CURRENCIES: { code: DisplayCurrencyCode; label: string }[] = [
  { code: "GBP", label: "£ GBP" },
  { code: "USD", label: "$ USD" },
  { code: "EUR", label: "€ EUR" },
];

export const DISPLAY_CURRENCY_STORAGE_KEY = "reclaimed_display_currency";

/** Fallback when Frankfurter is unreachable (1 GBP = x). */
export const FALLBACK_RATES_FROM_GBP: Record<Exclude<DisplayCurrencyCode, "GBP">, number> = {
  USD: 1.27,
  EUR: 1.17,
};

export function parseDisplayCurrency(raw: string | null | undefined): DisplayCurrencyCode {
  if (raw === "USD" || raw === "EUR" || raw === "GBP") return raw;
  return "GBP";
}

export function formatMajorUnits(majorUnits: number, currency: DisplayCurrencyCode): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(majorUnits);
  } catch {
    return `${currency} ${majorUnits.toFixed(2)}`;
  }
}

/** `rates.USD` = how many USD for 1 GBP (Frankfurter shape). */
export function convertPenceGbpToMajor(
  penceGbp: number,
  currency: DisplayCurrencyCode,
  rates: Partial<Record<Exclude<DisplayCurrencyCode, "GBP">, number>> | null
): number {
  const gbp = penceGbp / 100;
  if (currency === "GBP") return gbp;
  const rate =
    rates?.[currency] ??
    FALLBACK_RATES_FROM_GBP[currency as Exclude<DisplayCurrencyCode, "GBP">];
  return gbp * rate;
}
