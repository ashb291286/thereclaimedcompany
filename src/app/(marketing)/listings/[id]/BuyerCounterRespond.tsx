"use client";

import { useState } from "react";
import { buyerRespondToCounterOffer } from "@/lib/actions/offers";
import { useRouter } from "next/navigation";

export function BuyerCounterRespond({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go(action: "accept" | "decline") {
    setBusy(true);
    await buyerRespondToCounterOffer(offerId, action);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void go("accept")}
        className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-50"
      >
        Accept counter-offer
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void go("decline")}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  );
}
