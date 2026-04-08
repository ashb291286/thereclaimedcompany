"use client";

import { useState } from "react";
import { submitSellerCounterOffer } from "@/lib/actions/offers";
import { useRouter } from "next/navigation";

export function SellerCounterOfferForm({
  declinedOfferId,
  listingActive,
}: {
  declinedOfferId: string;
  listingActive: boolean;
}) {
  const router = useRouter();
  const [pounds, setPounds] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const n = Number(pounds);
    if (Number.isNaN(n) || n <= 0) {
      setErr("Enter a valid price.");
      return;
    }
    setBusy(true);
    const r = await submitSellerCounterOffer(declinedOfferId, n, note || undefined);
    setBusy(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setPounds("");
    setNote("");
    router.refresh();
  }

  if (!listingActive) {
    return (
      <p className="mt-3 text-xs text-zinc-500">
        Counter-offer isn’t available while this listing isn’t an active fixed-price item.
      </p>
    );
  }

  return (
    <form onSubmit={(e) => void send(e)} className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
      <p className="text-xs font-medium text-zinc-700">Counter-offer to the buyer</p>
      <p className="mt-1 text-[11px] text-zinc-500">
        They’ll be notified and can accept (locks price for checkout) or decline.
      </p>
      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-[11px] text-zinc-600">
          Your price (£)
          <input
            type="number"
            step="0.01"
            min="0"
            value={pounds}
            onChange={(e) => setPounds(e.target.value)}
            className="mt-0.5 w-28 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          Send counter-offer
        </button>
      </div>
      <label className="mt-2 block text-[11px] text-zinc-600">
        Note (optional)
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-0.5 w-full max-w-md rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
        />
      </label>
    </form>
  );
}
