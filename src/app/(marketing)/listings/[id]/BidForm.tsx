"use client";

import { useEffect, useState } from "react";
import { placeBid } from "@/lib/actions/bids";
import { useRouter } from "next/navigation";
import { BidPaymentSetup } from "./BidPaymentSetup";

export function BidForm({
  listingId,
  minimumPounds,
  hasBidPaymentMethod,
}: {
  listingId: string;
  minimumPounds: number;
  hasBidPaymentMethod: boolean;
}) {
  const router = useRouter();
  const [pounds, setPounds] = useState(minimumPounds.toFixed(2));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cardSaved, setCardSaved] = useState(hasBidPaymentMethod);

  useEffect(() => {
    setCardSaved(hasBidPaymentMethod);
  }, [hasBidPaymentMethod]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const n = parseFloat(pounds);
    const res = await placeBid(listingId, n);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    router.refresh();
  }

  if (!cardSaved) {
    return (
      <div className="rounded-xl border border-brand/20 bg-brand-soft/60 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Card required to bid</h3>
        <p className="mt-1 text-xs text-zinc-600">
          Save a card on file first. If you win, we charge it automatically when the auction ends (or
          you can complete payment on the listing if the automatic charge fails).
        </p>
        <div className="mt-4">
          <BidPaymentSetup
            onSaved={() => {
              setCardSaved(true);
              router.refresh();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-brand/20 bg-brand-soft/60 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">Place a bid</h3>
      <p className="mt-1 text-xs text-zinc-600">
        Minimum next bid from £{minimumPounds.toFixed(2)} (includes increment rules). Your saved card
        will be charged if you win.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <input
          type="number"
          step="0.01"
          min={minimumPounds}
          value={pounds}
          onChange={(e) => setPounds(e.target.value)}
          className="w-full flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm sm:max-w-[140px]"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {busy ? "Placing…" : "Place bid"}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </form>
  );
}
