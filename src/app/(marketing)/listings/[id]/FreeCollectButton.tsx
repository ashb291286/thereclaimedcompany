"use client";

import { useState } from "react";

export function FreeCollectButton({
  listingId,
  quantity = 1,
  label,
}: {
  listingId: string;
  quantity?: number;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      if (data.url) window.location.href = data.url;
      else setLoading(false);
    } catch {
      alert("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleConfirm()}
      disabled={loading}
      className="w-full rounded-lg border-2 border-emerald-600 bg-emerald-50 px-4 py-3 font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
    >
      {loading ? "Confirming…" : (label ?? "Confirm free collection")}
    </button>
  );
}
