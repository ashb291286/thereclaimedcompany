"use client";

import { useEffect, useState } from "react";
import { placeBid } from "@/lib/actions/bids";
import { useRouter } from "next/navigation";
import { BidPaymentSetup } from "./BidPaymentSetup";
import { createPortal } from "react-dom";

function bidDraftKey(listingId: string) {
  return `listing-bid-draft:${listingId}`;
}

export function BidForm({
  listingId,
  minimumPounds,
  hasBidPaymentMethod,
  chargesVat = false,
  isLeadingBidder = false,
  isGuest = false,
}: {
  listingId: string;
  minimumPounds: number;
  hasBidPaymentMethod: boolean;
  chargesVat?: boolean;
  /** Current user holds the top bid — they can only raise (next minimum updates after each bid). */
  isLeadingBidder?: boolean;
  isGuest?: boolean;
}) {
  const router = useRouter();
  const [pounds, setPounds] = useState(minimumPounds.toFixed(2));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cardSaved, setCardSaved] = useState(hasBidPaymentMethod);
  const [bidReceivedOpen, setBidReceivedOpen] = useState(false);
  const [confirmedBidLine, setConfirmedBidLine] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCardSaved(hasBidPaymentMethod);
  }, [hasBidPaymentMethod]);

  /** Keep the input aligned with server minimum after each bid / refresh (signed-in users). */
  useEffect(() => {
    if (isGuest) return;
    setPounds(minimumPounds.toFixed(2));
  }, [minimumPounds, isGuest]);

  useEffect(() => {
    if (!isGuest) return;
    try {
      const raw = sessionStorage.getItem(bidDraftKey(listingId));
      if (raw) {
        const parsed = JSON.parse(raw) as { pounds?: string };
        const p = parseFloat(String(parsed.pounds ?? ""));
        if (Number.isFinite(p) && p >= minimumPounds) {
          setPounds(p.toFixed(2));
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setPounds(minimumPounds.toFixed(2));
  }, [listingId, isGuest, minimumPounds]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem(bidDraftKey(listingId), JSON.stringify({ pounds }));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [listingId, pounds]);

  useEffect(() => {
    if (!bidReceivedOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setBidReceivedOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bidReceivedOpen]);

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
    try {
      sessionStorage.removeItem(bidDraftKey(listingId));
    } catch {
      /* ignore */
    }
    if (Number.isFinite(n)) {
      setConfirmedBidLine(
        `Your bid of £${n.toFixed(2)}${chargesVat ? " (incl. VAT)" : ""} has been recorded.`
      );
    } else {
      setConfirmedBidLine("Your bid has been recorded.");
    }
    setBidReceivedOpen(true);
    router.refresh();
  }

  function closeBidReceivedModal() {
    setBidReceivedOpen(false);
  }

  const bidReceivedModal =
    bidReceivedOpen && mounted ? (
      createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={closeBidReceivedModal}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="bid-received-title"
            aria-describedby="bid-received-desc"
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 id="bid-received-title" className="mt-4 text-lg font-semibold text-zinc-900">
              Your bid is received
            </h3>
            <p id="bid-received-desc" className="mt-2 text-sm text-zinc-600">
              {confirmedBidLine ?? "We’ve saved your bid on this auction."} You&apos;re the highest bidder for
              now. If someone outbids you, we&apos;ll notify you.
            </p>
            <button
              type="button"
              onClick={closeBidReceivedModal}
              className="mt-6 w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              OK
            </button>
          </div>
        </div>,
        document.body
      )
    ) : null;

  if (isGuest) {
    function onGuestBid(e: React.FormEvent) {
      e.preventDefault();
      setErr(null);
      const n = parseFloat(pounds);
      if (!Number.isFinite(n) || n < minimumPounds) {
        setErr(`Bid must be at least £${minimumPounds.toFixed(2)}.`);
        return;
      }
      try {
        sessionStorage.setItem(bidDraftKey(listingId), JSON.stringify({ pounds }));
      } catch {
        /* ignore */
      }
      window.location.href = `/auth/register?callbackUrl=${encodeURIComponent(`/listings/${listingId}`)}`;
    }

    return (
      <form onSubmit={onGuestBid} className="rounded-xl border border-brand/20 bg-brand-soft/60 p-4">
        <h3 className="text-sm font-semibold text-zinc-900">Place a bid</h3>
        <p className="mt-1 text-xs text-zinc-600">
          Minimum next bid from £{minimumPounds.toFixed(2)}
          {chargesVat ? " (incl. VAT)" : ""} (increment rules). Create a free account next, then save a card — if you
          win, we charge it when the auction ends.
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
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Continue with account
          </button>
        </div>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      </form>
    );
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
    <>
      {bidReceivedModal}
    <form onSubmit={onSubmit} className="rounded-xl border border-brand/20 bg-brand-soft/60 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        {isLeadingBidder ? "Raise your bid" : "Place a bid"}
      </h3>
      <p className="mt-1 text-xs text-zinc-600">
        {isLeadingBidder ? (
          <>
            You&apos;re the highest bidder — you can raise your bid any time. Next minimum is{" "}
            <strong>
              £{minimumPounds.toFixed(2)}
              {chargesVat ? " (incl. VAT)" : ""}
            </strong>{" "}
            (increment rules). Your saved card will be charged if you win.
          </>
        ) : (
          <>
            Minimum next bid from £{minimumPounds.toFixed(2)}
            {chargesVat ? " (incl. VAT)" : ""} (includes increment rules). Your saved card will be charged if you
            win.
          </>
        )}
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
          {busy ? "Submitting…" : isLeadingBidder ? "Update bid" : "Place bid"}
        </button>
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </form>
    </>
  );
}
