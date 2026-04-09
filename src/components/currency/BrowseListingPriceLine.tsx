"use client";

import { DisplayPrice } from "./DisplayPrice";

/** Home / search card line: price + VAT note + category (+ optional condition). */
export function BrowseListingPriceLine({
  listingKind,
  freeToCollector,
  buyerPenceGbp,
  vatSuffix,
  categoryName,
  conditionExtra,
  className = "text-sm text-zinc-500",
}: {
  listingKind: "sell" | "auction";
  freeToCollector: boolean;
  buyerPenceGbp: number;
  vatSuffix: string;
  categoryName: string;
  conditionExtra?: string;
  className?: string;
}) {
  if (listingKind === "sell" && freeToCollector) {
    return (
      <p className={className}>
        Free to collect · {categoryName}
        {conditionExtra ?? ""}
      </p>
    );
  }

  const prefix = listingKind === "auction" ? "From " : "";

  return (
    <p className={className}>
      <DisplayPrice penceGbp={buyerPenceGbp} prefix={prefix} suffix={vatSuffix} />
      {` · ${categoryName}`}
      {conditionExtra ?? ""}
    </p>
  );
}
