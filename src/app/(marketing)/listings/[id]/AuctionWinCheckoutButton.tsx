"use client";

import { useDisplayCurrency } from "@/components/currency/CurrencyProvider";
import { BuyButton } from "./BuyButton";

export function AuctionWinCheckoutButton({
  listingId,
  bidId,
  penceGbp,
  vatNote,
}: {
  listingId: string;
  bidId: string;
  penceGbp: number;
  vatNote: string;
}) {
  const { formatPence } = useDisplayCurrency();
  return (
    <BuyButton
      listingId={listingId}
      bidId={bidId}
      label={
        <>
          Pay winning bid {formatPence(penceGbp)}
          {vatNote}
        </>
      }
    />
  );
}
