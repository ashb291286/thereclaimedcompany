"use client";

import { useState } from "react";

type Props = {
  listingId: string;
  offerId?: string;
  bidId?: string;
  label?: string;
  disabled?: boolean;
  disabledReason?: string;
  /** For per-unit listings (ignored when paying an offer or auction). */
  quantity?: number;
};

export function BuyButton({
  listingId,
  offerId,
  bidId,
  label = "Buy now",
  disabled,
  disabledReason,
  quantity = 1,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (disabled) return;
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          offerId,
          bidId,
          quantity: offerId || bidId ? 1 : quantity,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      alert("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleClick();
      }}
      disabled={loading || disabled}
      title={disabled ? disabledReason : undefined}
      className="w-full rounded-lg bg-brand px-4 py-3 font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Redirecting…" : label}
    </button>
  );
}
