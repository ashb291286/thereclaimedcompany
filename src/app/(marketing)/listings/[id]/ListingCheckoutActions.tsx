"use client";

import { useEffect, useState } from "react";
import { ListingPricingMode } from "@/generated/prisma/client";
import { BuyButton } from "./BuyButton";
import { FreeCollectButton } from "./FreeCollectButton";

export function ListingCheckoutActions({
  listingId,
  freeToCollector,
  pricingMode,
  unitsAvailable,
  offerId,
  offerPayLabel,
}: {
  listingId: string;
  freeToCollector: boolean;
  pricingMode: ListingPricingMode;
  unitsAvailable: number | null;
  offerId?: string;
  offerPayLabel?: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const maxUnits =
    pricingMode === ListingPricingMode.PER_UNIT && unitsAvailable != null && unitsAvailable >= 1
      ? unitsAvailable
      : 1;

  useEffect(() => {
    setQuantity(1);
  }, [listingId, maxUnits]);

  useEffect(() => {
    if (quantity > maxUnits) setQuantity(Math.max(1, maxUnits));
  }, [quantity, maxUnits]);

  if (offerId) {
    return (
      <BuyButton
        listingId={listingId}
        offerId={offerId}
        label={offerPayLabel ?? "Pay agreed price"}
      />
    );
  }

  const showQty = maxUnits > 1;

  return (
    <div className="space-y-3">
      {showQty ? (
        <label className="block text-sm font-medium text-zinc-700">
          Quantity
          <input
            type="number"
            min={1}
            max={maxUnits}
            value={quantity}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!Number.isFinite(n)) return;
              setQuantity(Math.min(Math.max(1, n), maxUnits));
            }}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <span className="mt-1 block text-xs text-zinc-500">Up to {maxUnits} available.</span>
        </label>
      ) : null}
      {freeToCollector ? (
        <FreeCollectButton listingId={listingId} quantity={quantity} />
      ) : (
        <BuyButton listingId={listingId} label="Buy at listed price" quantity={quantity} />
      )}
    </div>
  );
}
