"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BuyButton({ listingId }: { listingId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleBuy() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
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
      onClick={handleBuy}
      disabled={loading}
      className="w-full rounded-lg bg-amber-600 px-4 py-3 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
    >
      {loading ? "Redirecting…" : "Buy now"}
    </button>
  );
}
