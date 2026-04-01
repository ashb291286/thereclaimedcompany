"use client";

import { useState } from "react";
import { placeBid } from "@/lib/actions/bids";
import { useRouter } from "next/navigation";

export function BidForm({
  listingId,
  minimumPounds,
}: {
  listingId: string;
  minimumPounds: number;
}) {
  const router = useRouter();
  const [pounds, setPounds] = useState(minimumPounds.toFixed(2));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-brand/20 bg-brand-soft/60 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">Place a bid</h3>
      <p className="mt-1 text-xs text-zinc-600">
        Minimum next bid from £{minimumPounds.toFixed(2)} (includes increment rules).
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
