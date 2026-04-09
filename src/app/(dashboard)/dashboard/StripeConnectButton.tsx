"use client";

import { useState } from "react";

export function StripeConnectButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow: "dashboard" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (data.url) window.location.href = data.url;
      else throw new Error("No URL returned");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
    >
      {loading ? "Redirecting…" : "Complete Stripe setup"}
    </button>
  );
}
