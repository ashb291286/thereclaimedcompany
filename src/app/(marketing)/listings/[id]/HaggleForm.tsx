"use client";

import { useState } from "react";
import { submitOffer } from "@/lib/actions/offers";
import { useRouter } from "next/navigation";

export function HaggleForm({
  listingId,
  listPricePence,
  chargesVat = false,
}: {
  listingId: string;
  listPricePence: number;
  chargesVat?: boolean;
}) {
  const router = useRouter();
  const [pounds, setPounds] = useState(
    (listPricePence / 100).toFixed(2)
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk(null);
    const n = parseFloat(pounds);
    const res = await submitOffer(listingId, n, message || undefined);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setOk("Offer sent. The seller will respond in their dashboard.");
    setMessage("");
    router.refresh();
  }

  return (
    <form id="listing-offer" onSubmit={onSubmit} className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">Make an offer</h3>
      <p className="mt-1 text-xs text-zinc-600">
        {chargesVat
          ? "Enter the total you are willing to pay, including 20% VAT. If the seller accepts, you will pay that amount at checkout."
          : "Suggest a price. If the seller accepts, you will pay that amount at checkout."}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="offer-price" className="text-xs font-medium text-zinc-600">
            Your offer (£)
          </label>
          <input
            id="offer-price"
            type="number"
            step="0.01"
            min="0.01"
            value={pounds}
            onChange={(e) => setPounds(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send offer"}
        </button>
      </div>
      <div className="mt-2">
        <label htmlFor="offer-msg" className="text-xs font-medium text-zinc-600">
          Message (optional)
        </label>
        <input
          id="offer-msg"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. Can collect this weekend"
          className="mt-0.5 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      {ok && <p className="mt-2 text-sm text-green-700">{ok}</p>}
    </form>
  );
}
