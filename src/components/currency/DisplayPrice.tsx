"use client";

import { useDisplayCurrency } from "./CurrencyProvider";

/** Inline formatted money from GBP pence (buyer-facing amounts). */
export function DisplayPrice({
  penceGbp,
  prefix = "",
  suffix = "",
  className,
}: {
  penceGbp: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const { formatPence } = useDisplayCurrency();
  return (
    <span className={className}>
      {prefix}
      {formatPence(penceGbp)}
      {suffix}
    </span>
  );
}
