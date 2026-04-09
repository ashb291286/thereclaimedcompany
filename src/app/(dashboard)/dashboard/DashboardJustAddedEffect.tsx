"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Scrolls the new listing into view and drops `justAdded` from the URL after a few seconds
 * so the address bar is clean while the highlight animation finishes.
 */
export function DashboardJustAddedEffect({ listingId }: { listingId: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!listingId) return;

    const el = document.getElementById(`dashboard-listing-${listingId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });

    const t = window.setTimeout(() => {
      router.replace("/dashboard");
    }, 9000);

    return () => window.clearTimeout(t);
  }, [listingId, router]);

  return null;
}
