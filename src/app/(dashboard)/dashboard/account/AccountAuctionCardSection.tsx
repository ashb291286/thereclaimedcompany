"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BidPaymentSetup } from "@/app/(marketing)/listings/[id]/BidPaymentSetup";
import {
  clearBidPaymentMethodAction,
  type BidCardSummary,
} from "@/lib/actions/bid-payment";

function formatBrand(brand: string): string {
  const b = brand.toLowerCase();
  if (b === "amex") return "American Express";
  if (b === "diners") return "Diners Club";
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function AccountAuctionCardSection({ card }: { card: BidCardSummary | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">Card for auction bidding</h2>
      <p className="mt-1 text-sm text-zinc-600">
        If you win a marketplace auction, we charge this saved card automatically. You can add or replace it here
        anytime — same card flow as when you first bid on a listing.
      </p>

      {card && !editing ? (
        <div className="mt-4 rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-4 py-3">
          <p className="text-sm font-medium text-zinc-900">
            {formatBrand(card.brand)} ···· {card.last4}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Expires {String(card.expMonth).padStart(2, "0")}/{card.expYear}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Replace card
            </button>
            <form action={clearBidPaymentMethodAction}>
              <button
                type="submit"
                className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-50"
              >
                Remove card
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {(!card || editing) && (
        <div className="mt-4">
          {editing && card ? (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="mb-3 text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              ← Keep current card
            </button>
          ) : null}
          {!card ? (
            <p className="mb-3 text-sm text-zinc-600">No card on file yet. Add one to bid on auctions.</p>
          ) : null}
          <div className="max-w-md rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
            <BidPaymentSetup
              onSaved={() => {
                setEditing(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
