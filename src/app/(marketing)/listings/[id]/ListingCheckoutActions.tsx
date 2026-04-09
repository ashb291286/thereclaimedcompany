"use client";

import { useEffect, useState } from "react";
import { ListingPricingMode } from "@/lib/listing-client-enums";
import { useDisplayCurrency } from "@/components/currency/CurrencyProvider";
import { BuyButton } from "./BuyButton";
import { FreeCollectButton } from "./FreeCollectButton";

export function ListingCheckoutActions({
  listingId,
  freeToCollector,
  pricingMode,
  unitsAvailable,
  unitPricePence,
  offerId,
  offerPayLabel,
  offerPayPenceGbp,
  offerVatSuffix,
}: {
  listingId: string;
  freeToCollector: boolean;
  pricingMode: ListingPricingMode;
  unitsAvailable: number | null;
  /** Listed price in pence (per unit when PER_UNIT, or full lot when LOT). */
  unitPricePence: number;
  offerId?: string;
  /** @deprecated Prefer offerPayPenceGbp + offerVatSuffix for currency display */
  offerPayLabel?: string;
  offerPayPenceGbp?: number;
  offerVatSuffix?: string;
}) {
  const { formatPence } = useDisplayCurrency();
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
    const label =
      offerPayPenceGbp != null ? (
        <>
          Pay agreed {formatPence(offerPayPenceGbp)}
          {offerVatSuffix ?? ""}
        </>
      ) : (
        (offerPayLabel ?? "Pay agreed price")
      );
    return (
      <BuyButton listingId={listingId} offerId={offerId} label={label} />
    );
  }

  const showQty = maxUnits > 1;
  const totalPence = unitPricePence * quantity;
  const unitLine =
    pricingMode === ListingPricingMode.PER_UNIT
      ? `${formatPence(unitPricePence)} each`
      : "Price for full lot";

  const buyLabel =
    quantity === 1 ? `Buy for ${formatPence(totalPence)}` : `Buy ${quantity} for ${formatPence(totalPence)}`;

  const freeLabel =
    quantity === 1
      ? "Confirm free collection"
      : `Confirm free collection · ${quantity} units`;

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
          <span className="mt-1 block text-xs text-zinc-500">
            Up to {maxUnits} available · {unitLine}
          </span>
        </label>
      ) : null}
      {!freeToCollector && !offerId && showQty ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-zinc-600">Total</span>
            <span className="text-lg font-semibold tabular-nums text-zinc-900">{formatPence(totalPence)}</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {quantity} × {formatPence(unitPricePence)} {pricingMode === ListingPricingMode.PER_UNIT ? "each" : ""}
          </p>
        </div>
      ) : null}
      {freeToCollector ? (
        <div className="space-y-2">
          {pricingMode === ListingPricingMode.PER_UNIT && showQty ? (
            <p className="text-sm text-zinc-600">
              <span className="font-medium text-zinc-800">Total</span> — £0.00 ({quantity}{" "}
              unit{quantity === 1 ? "" : "s"})
            </p>
          ) : null}
          <FreeCollectButton listingId={listingId} quantity={quantity} label={freeLabel} />
        </div>
      ) : (
        <BuyButton listingId={listingId} label={buyLabel} quantity={quantity} />
      )}
    </div>
  );
}
