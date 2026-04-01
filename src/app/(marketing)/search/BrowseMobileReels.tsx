"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";

export type ReelListing = {
  id: string;
  title: string;
  imageUrl: string | null;
  priceLine: string;
  categoryName: string;
  conditionLabel: string;
  listingKind: "sell" | "auction";
  freeToCollector: boolean;
  offersDelivery: boolean;
  distanceLabel: string | null;
  carbonSavedKg: number | null;
};

export function BrowseMobileReels({ listings }: { listings: ReelListing[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const shareListing = useCallback(async (l: ReelListing) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/listings/${l.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: l.title,
          text: `${l.title} — ${l.priceLine} on Reclaimed Marketplace`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiedId(l.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* user cancelled share */
    }
  }, []);

  if (listings.length === 0) return null;

  return (
    <div
      className="md:hidden relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-3 pb-6 sm:px-4"
      aria-label="Swipe through listings"
    >
      <div
        className="mx-auto max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-y-contain snap-y snap-mandatory [scrollbar-width:thin]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <ul className="flex flex-col gap-3 pt-1">
          {listings.map((l) => (
            <li
              key={l.id}
              className="relative h-[min(calc(100dvh-5.5rem),640px)] min-h-[22rem] w-full shrink-0 snap-start snap-always overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-900 shadow-2xl ring-1 ring-black/10"
            >
              <div className="absolute inset-0">
                {l.imageUrl ? (
                  <Image
                    src={l.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="100vw"
                    unoptimized
                    priority={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-500">
                    No photo
                  </div>
                )}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10"
                  aria-hidden
                />
              </div>

              <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end p-4 pt-16 text-white">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {l.listingKind === "auction" && (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm">
                      Auction
                    </span>
                  )}
                  {l.listingKind === "sell" && l.freeToCollector && (
                    <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold uppercase">
                      Free
                    </span>
                  )}
                  {l.offersDelivery && (
                    <span className="rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-bold uppercase">
                      Delivers
                    </span>
                  )}
                  {l.distanceLabel ? (
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
                      {l.distanceLabel}
                    </span>
                  ) : null}
                  {l.carbonSavedKg != null && l.carbonSavedKg > 0 ? (
                    <span className="rounded-full bg-emerald-600/80 px-2 py-0.5 text-[10px] font-semibold">
                      🌱 ~{Math.round(l.carbonSavedKg)} kg CO₂e
                    </span>
                  ) : null}
                </div>
                <p className="line-clamp-2 text-lg font-semibold leading-snug drop-shadow-sm">{l.title}</p>
                <p className="mt-1 text-sm font-medium text-white/95">{l.priceLine}</p>
                <p className="mt-0.5 text-xs text-white/75">
                  {l.categoryName} · {l.conditionLabel}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/listings/${l.id}`}
                    className="inline-flex flex-1 min-w-[8rem] items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg transition hover:bg-zinc-100"
                  >
                    View listing
                  </Link>
                  <button
                    type="button"
                    onClick={() => void shareListing(l)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/40 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
                  >
                    <ShareIcon />
                    Share
                  </button>
                </div>
                {copiedId === l.id ? (
                  <p className="mt-2 text-center text-xs text-emerald-300">Link copied</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-90" aria-hidden>
      <path
        d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
