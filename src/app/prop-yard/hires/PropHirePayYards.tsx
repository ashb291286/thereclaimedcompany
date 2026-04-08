"use client";

import { useState } from "react";

export type PropPayGroup = {
  sellerId: string;
  displayName: string;
  totalPence: number;
  allPaid: boolean;
};

export function PropHirePayYards({ batchId, groups }: { batchId: string; groups: PropPayGroup[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay(sellerId: string) {
    setError(null);
    setBusy(sellerId);
    try {
      const res = await fetch("/api/prop-hire/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, sellerId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Could not start checkout.");
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(null);
    }
  }

  if (groups.length === 0) return null;

  return (
    <div className="mt-6 space-y-3 text-left">
      <p className="text-xs font-semibold uppercase tracking-wide text-driven-muted">Pay through the platform</p>
      <p className="text-sm text-driven-muted">
        One secure Stripe checkout per supplier (same as marketplace sales). The yard is paid via Connect; we hold
        your request until payment completes.
      </p>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <ul className="space-y-2">
        {groups.map((g) => (
          <li
            key={g.sellerId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-driven-warm bg-driven-paper px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-driven-ink">{g.displayName}</p>
              <p className="text-xs text-driven-muted">£{(g.totalPence / 100).toFixed(2)} hire total</p>
            </div>
            {g.allPaid ? (
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Paid</span>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void pay(g.sellerId)}
                className="rounded-lg border border-driven-ink bg-driven-ink px-3 py-1.5 font-[family-name:var(--font-driven-mono)] text-[10px] font-semibold uppercase tracking-wide text-driven-paper hover:bg-driven-accent disabled:opacity-50"
              >
                {busy === g.sellerId ? "Opening…" : "Pay now"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
