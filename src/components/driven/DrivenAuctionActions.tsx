"use client";

export function DrivenAuctionActions() {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        className="w-full border border-driven-ink bg-driven-ink py-3 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
      >
        Bid now ↗
      </button>
      <button
        type="button"
        className="w-full border border-driven-warm py-3 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-ink hover:border-driven-ink"
      >
        Watch
      </button>
      <button
        type="button"
        className="w-full border border-driven-warm py-3 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-ink hover:border-driven-ink"
      >
        Add to garage
      </button>
      <p className="font-[family-name:var(--font-driven-body)] text-[11px] leading-relaxed text-driven-muted">
        Bidding and garage sync with your Reclaimed account will arrive in a later release. This preview shows the
        Reclaimed experience.
      </p>
    </div>
  );
}
