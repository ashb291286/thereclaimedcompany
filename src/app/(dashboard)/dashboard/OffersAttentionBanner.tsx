"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const LS_KEY = "reclaimed.dashboard.offersAttention";

type Props = {
  incomingAsSeller: number;
  pendingCountersAsBuyer: number;
};

export function OffersAttentionBanner({ incomingAsSeller, pendingCountersAsBuyer }: Props) {
  const fingerprint = `${incomingAsSeller}:${pendingCountersAsBuyer}`;
  const [dismissedMatches, setDismissedMatches] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const dismissed = raw ? (JSON.parse(raw) as { fp?: string }) : null;
      setDismissedMatches(dismissed?.fp === fingerprint);
    } catch {
      setDismissedMatches(false);
    }
  }, [fingerprint]);

  if (dismissedMatches === null) {
    return null;
  }

  const hasWork = incomingAsSeller > 0 || pendingCountersAsBuyer > 0;
  const visible = hasWork && !dismissedMatches;

  function dismiss() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ fp: fingerprint }));
    } catch {
      /* ignore */
    }
    setDismissedMatches(true);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-brand/35 bg-gradient-to-r from-brand-soft/90 to-violet-50/60 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Offers</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {incomingAsSeller > 0 && pendingCountersAsBuyer > 0
              ? "New buyer offers and a counter-offer need your attention."
              : incomingAsSeller > 0
                ? `${incomingAsSeller === 1 ? "A buyer offer" : `${incomingAsSeller} buyer offers`} waiting for accept, decline, or counter.`
                : `${pendingCountersAsBuyer === 1 ? "A seller counter-offer" : `${pendingCountersAsBuyer} seller counter-offers`} waiting for your response.`}
          </p>
          <Link
            href="/dashboard/offers"
            className="mt-2 inline-block text-sm font-semibold text-brand hover:underline"
          >
            Open offers &amp; haggling →
          </Link>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
