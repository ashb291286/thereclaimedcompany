"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function viewStorageKey(listingId: string) {
  return `listing_view_${listingId}`;
}

function fomoVariantFromId(listingId: string): number {
  let h = 0;
  for (let i = 0; i < listingId.length; i++) {
    h = (h + listingId.charCodeAt(i) * (i + 1)) % 999;
  }
  return h % 3;
}

export function ListingFomoStrip({
  listingId,
  views7d,
  favoriteCount,
  isOwner,
}: {
  listingId: string;
  views7d: number;
  favoriteCount: number;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [displayViews, setDisplayViews] = useState(views7d);
  const posted = useRef(false);

  useEffect(() => {
    setDisplayViews(views7d);
  }, [views7d]);

  useEffect(() => {
    if (isOwner || posted.current) return;
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(viewStorageKey(listingId))) return;
    } catch {
      return;
    }

    posted.current = true;
    void fetch(`/api/listings/${listingId}/view`, { method: "POST" })
      .then((res) => {
        if (!res.ok) {
          posted.current = false;
          return;
        }
        try {
          sessionStorage.setItem(viewStorageKey(listingId), "1");
        } catch {
          /* ignore */
        }
        setDisplayViews((v) => v + 1);
        router.refresh();
      })
      .catch(() => {
        posted.current = false;
      });
  }, [listingId, isOwner, router]);

  const variant = fomoVariantFromId(listingId);
  const v = displayViews;

  let primary: ReactNode;
  if (v <= 0) {
    primary = (
      <>
        <span className="font-medium text-zinc-800">Fresh on the marketplace</span> — reclaimed pieces
        move quickly. Save it if you&apos;re interested.
      </>
    );
  } else if (variant === 0) {
    primary = (
      <>
        <strong className="font-semibold text-zinc-900">{v}</strong> people viewed this listing in the last
        7 days.
      </>
    );
  } else if (variant === 1) {
    primary = (
      <>
        <strong className="font-semibold text-zinc-900">{v}+ recent views</strong> this week — others are
        browsing this reclaimed item.
      </>
    );
  } else {
    primary = (
      <>
        <strong className="font-semibold text-zinc-900">{v} buyers</strong> viewed this recently.
        Worth a closer look.
      </>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/90 to-orange-50/50 px-3 py-2.5 text-sm leading-snug text-amber-950/90">
      <p>{primary}</p>
      {favoriteCount > 0 ? (
        <p className="mt-1.5 text-xs text-amber-900/85">
          <strong className="font-semibold">{favoriteCount}</strong> buyer{favoriteCount === 1 ? "" : "s"}{" "}
          saved this to favourites.
        </p>
      ) : null}
    </div>
  );
}
