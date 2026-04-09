"use client";

import { useState } from "react";
import { respondToOffer } from "@/lib/actions/offers";
import { useRouter } from "next/navigation";
import { SellerCounterOfferForm } from "./SellerCounterOfferForm";

export function OfferRespond({
  offerId,
  listingActive,
}: {
  offerId: string;
  listingActive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showCounter, setShowCounter] = useState(false);

  async function go(action: "accept" | "decline") {
    setBusy(true);
    await respondToOffer(offerId, action);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void go("accept")}
          className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
        >
          Accept
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void go("decline")}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          Decline
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setShowCounter((v) => !v)}
          className="rounded-lg border border-brand/40 bg-white px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft disabled:opacity-50"
        >
          {showCounter ? "Hide counter" : "Counter"}
        </button>
      </div>
      {showCounter ? (
        <SellerCounterOfferForm baseOfferId={offerId} listingActive={listingActive} />
      ) : null}
    </div>
  );
}
