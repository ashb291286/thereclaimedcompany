"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDisplayCurrency } from "@/components/currency/CurrencyProvider";
import { useRouter } from "next/navigation";
import { BrowseListingGrid } from "./BrowseListingGrid";
import type { SearchListingRow } from "@/lib/listing-search";
import {
  searchListingRowToReel,
  type ReelListing,
  type SearchListingRowReelInput,
} from "@/lib/browse-reel-listing";

const MOBILE_BROWSE_LAYOUT_KEY = "reclaimed:browseMobileLayout";
type MobileBrowseLayout = "swipe" | "cards";

export type { ReelListing };

type FeedQuery = {
  q?: string;
  /** Category slug (preferred for URLs and `/api/listings`). */
  category?: string;
  postcode?: string;
  radius?: string;
  sellerType?: string;
  hireOnly?: string;
  availableNow?: string;
  ids?: string;
  fromImage?: string;
  sort?: string;
  listingType?: string;
  source?: string;
};

function auctionCountdownLabelFromIso(iso: string | null): string | null {
  if (!iso) return null;
  const endsAt = new Date(iso);
  if (Number.isNaN(endsAt.getTime())) return null;
  const ms = endsAt.getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days >= 1) return `${days}d ${hours}h left`;
  if (hours >= 1) return `${hours}h ${minutes}m left`;
  return `${Math.max(1, minutes)}m left`;
}

export function BrowseMobileReels({
  listings,
  initialPage,
  totalPages,
  query,
  profileHref,
  initialSearch,
  gridListings,
  enableSwipeCardsToggle,
}: {
  listings: ReelListing[];
  initialPage: number;
  totalPages: number;
  query: FeedQuery;
  profileHref: string;
  initialSearch?: string;
  /** When set with `enableSwipeCardsToggle`, buyers can switch to a card grid on mobile. */
  gridListings?: SearchListingRow[];
  enableSwipeCardsToggle?: boolean;
}) {
  const router = useRouter();
  const { formatPence } = useDisplayCurrency();
  const [items, setItems] = useState<ReelListing[]>(listings);
  const [searchText, setSearchText] = useState(initialSearch ?? "");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mobileLayout, setMobileLayout] = useState<MobileBrowseLayout>("swipe");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = page < totalPages;
  const showLayoutToggle = Boolean(enableSwipeCardsToggle && gridListings?.length);

  useEffect(() => {
    if (!showLayoutToggle) return;
    try {
      const raw = window.localStorage.getItem(MOBILE_BROWSE_LAYOUT_KEY);
      if (raw === "swipe" || raw === "cards") setMobileLayout(raw);
    } catch {
      /* ignore */
    }
  }, [showLayoutToggle]);

  const persistMobileLayout = useCallback((next: MobileBrowseLayout) => {
    setMobileLayout(next);
    try {
      window.localStorage.setItem(MOBILE_BROWSE_LAYOUT_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setItems(listings);
    setPage(initialPage);
    setLoadError(null);
  }, [listings, initialPage]);

  const shareListing = useCallback(
    async (l: ReelListing) => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/listings/${l.id}`;
      const priceText = l.freeToCollectPrice
        ? "Free to collect"
        : `${l.listingKind === "auction" ? "From " : ""}${formatPence(l.buyerPenceGbp)}${l.vatSuffix}`;
      try {
        if (navigator.share) {
          await navigator.share({
            title: l.title,
            text: `${l.title} — ${priceText} on Reclaimed Marketplace`,
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
    },
    [formatPence]
  );

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (query.q) sp.set("q", query.q);
    if (query.category) sp.set("category", query.category);
    if (query.postcode) sp.set("postcode", query.postcode);
    if (query.radius) sp.set("radius", query.radius);
    if (query.sellerType) sp.set("sellerType", query.sellerType);
    if (query.hireOnly) sp.set("hireOnly", query.hireOnly);
    if (query.availableNow) sp.set("availableNow", query.availableNow);
    if (query.ids) sp.set("ids", query.ids);
    if (query.fromImage) sp.set("fromImage", query.fromImage);
    if (query.sort) sp.set("sort", query.sort);
    if (query.listingType) sp.set("listingType", query.listingType);
    if (query.source) sp.set("source", query.source);
    return sp.toString();
  }, [query]);
  const scrollKey = useMemo(
    () => `browse-mobile-scroll:${mobileLayout}:${queryString}`,
    [mobileLayout, queryString]
  );

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    try {
      const raw = window.sessionStorage.getItem(scrollKey);
      if (!raw) return;
      const top = Number(raw);
      if (!Number.isFinite(top) || top < 0) return;
      // Restore after layout settles so snap positions are valid.
      window.requestAnimationFrame(() => {
        el.scrollTop = top;
      });
    } catch {
      /* ignore storage restore failures */
    }
  }, [scrollKey, items.length]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadError(null);
    const nextPage = page + 1;
    try {
      const qs = new URLSearchParams(queryString);
      qs.set("page", String(nextPage));
      qs.set("pageSize", "15");
      const res = await fetch(`/api/listings?${qs.toString()}`, { method: "GET" });
      if (!res.ok) throw new Error("Failed to load listings");
      const data = (await res.json()) as { listings: SearchListingRowReelInput[]; page: number };
      const mapped = data.listings.map((row) => searchListingRowToReel(row));
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const unique = mapped.filter((m) => !seen.has(m.id));
        return [...prev, ...unique];
      });
      setPage(nextPage);
    } catch {
      setLoadError("Couldn’t load more listings. Tap to retry.");
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page, queryString]);

  useEffect(() => {
    if (mobileLayout !== "swipe" || !hasMore || !sentinelRef.current) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "300px 0px 300px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore, mobileLayout]);

  if (items.length === 0) return null;

  return (
    <div
      className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 md:hidden"
      aria-label="Swipe through listings"
    >
      <div
        ref={scrollContainerRef}
        className="mx-auto h-[100dvh] overflow-y-auto overscroll-y-contain bg-stone-50 snap-y snap-mandatory [scrollbar-width:none]"
        style={{ WebkitOverflowScrolling: "touch" }}
        onScroll={() => {
          const el = scrollContainerRef.current;
          if (!el) return;
          try {
            window.sessionStorage.setItem(scrollKey, String(el.scrollTop));
          } catch {
            /* ignore storage write failures */
          }
        }}
      >
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-black/55 via-black/25 to-transparent px-3 pb-4 pt-[max(env(safe-area-inset-top),0.75rem)]">
          <div className="pointer-events-auto mx-auto flex max-w-xl items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/45 bg-black/30 text-white backdrop-blur"
              aria-label="Back"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                <path
                  d="M15 5 8 12l7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <form
              className="min-w-0 flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                const sp = new URLSearchParams(queryString);
                if (searchText.trim()) sp.set("q", searchText.trim());
                else sp.delete("q");
                sp.delete("page");
                router.push(`/search?${sp.toString()}`);
              }}
            >
              <input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search listings"
                className="h-9 w-full rounded-full border border-white/45 bg-black/35 px-4 text-sm text-white placeholder:text-white/70 backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/60"
              />
            </form>
            {showLayoutToggle ? (
              <div
                className="flex shrink-0 rounded-full border border-white/45 bg-black/40 p-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur"
                role="group"
                aria-label="Listing view"
              >
                <button
                  type="button"
                  onClick={() => persistMobileLayout("swipe")}
                  className={`rounded-full px-2 py-1.5 leading-none transition ${mobileLayout === "swipe" ? "bg-white/25 shadow-sm" : "text-white/80 hover:text-white"}`}
                >
                  Swipe
                </button>
                <button
                  type="button"
                  onClick={() => persistMobileLayout("cards")}
                  className={`rounded-full px-2 py-1.5 leading-none transition ${mobileLayout === "cards" ? "bg-white/25 shadow-sm" : "text-white/80 hover:text-white"}`}
                >
                  Cards
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {mobileLayout === "cards" && gridListings ? (
          <div className="min-h-[100dvh] bg-stone-50 px-2 pb-36 pt-[calc(3.25rem+max(env(safe-area-inset-top),0.75rem))]">
            <BrowseListingGrid listings={gridListings} visibility="always" className="mt-0" />
          </div>
        ) : (
          <>
        <ul className="flex flex-col gap-0">
          {items.map((l) => {
            const auctionCountdown =
              l.listingKind === "auction" ? auctionCountdownLabelFromIso(l.auctionEndsAtIso) : null;
            return (
            <li
              key={l.id}
              className="relative h-[100dvh] min-h-[100dvh] w-full shrink-0 snap-start snap-always overflow-hidden bg-zinc-900"
            >
              <div className="absolute inset-0">
                {auctionCountdown ? (
                  <span className="absolute right-3 top-3 z-10 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                    {auctionCountdown}
                  </span>
                ) : null}
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

              <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end p-4 pb-32 pt-16 text-white">
                <div
                  className="pointer-events-none absolute right-4 top-8 z-20 rounded-lg bg-white p-1 shadow-md ring-1 ring-zinc-200/90"
                  aria-hidden
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/the-reclaimed-company-logo.png"
                    alt=""
                    width={36}
                    height={36}
                    loading="lazy"
                    decoding="async"
                    className="block h-9 w-9 object-contain"
                  />
                </div>
                <div className="mb-2 flex min-h-[20px] flex-wrap content-start items-start gap-1.5 pr-11">
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
                <p className="line-clamp-2 pr-10 text-lg font-semibold leading-snug drop-shadow-sm">{l.title}</p>
                <p className="mt-1 text-sm font-medium text-white/95">
                  {l.freeToCollectPrice ? (
                    "Free to collect"
                  ) : (
                    <>
                      {l.listingKind === "auction" ? "From " : ""}
                      {formatPence(l.buyerPenceGbp)}
                      {l.vatSuffix}
                    </>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-white/75">
                  {l.categoryName} · {l.conditionLabel}
                </p>

                <Link
                  href={l.sellerProfileHref}
                  className="mt-3 flex min-h-11 max-w-full items-center gap-2.5 rounded-xl border border-white/25 bg-black/35 px-2.5 py-2 text-left backdrop-blur-sm transition hover:bg-black/50"
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/30 bg-zinc-700">
                    <Image
                      src={l.sellerAvatarUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="40px"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white drop-shadow-sm">{l.sellerDisplayName}</p>
                    {l.sellerReviewAvg != null && l.sellerReviewCount > 0 ? (
                      <p className="mt-0.5 text-xs text-white/80">
                        <span className="text-amber-400" aria-hidden>
                          ★
                        </span>{" "}
                        <span className="font-medium text-white">{l.sellerReviewAvg.toFixed(1)}</span>
                        <span className="text-white/45"> · </span>
                        <span>
                          {l.sellerReviewCount} review{l.sellerReviewCount === 1 ? "" : "s"}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-white/60">No reviews yet</p>
                    )}
                  </div>
                </Link>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/listings/${l.id}`}
                    onClick={() => {
                      const el = scrollContainerRef.current;
                      if (!el) return;
                      try {
                        window.sessionStorage.setItem(scrollKey, String(el.scrollTop));
                      } catch {
                        /* ignore storage write failures */
                      }
                    }}
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
          );
          })}
        </ul>
        <div ref={sentinelRef} className="h-12" />
        {loadingMore ? (
          <p className="pb-20 text-center text-xs text-zinc-500">Loading more listings…</p>
        ) : null}
        {loadError ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="mx-auto mb-3 block rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-700"
          >
            {loadError}
          </button>
        ) : null}
          </>
        )}
      </div>

      <div className="fixed inset-x-0 z-50 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-4 pt-6 [bottom:calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
        <div className="mx-auto grid max-w-xl grid-cols-4 gap-1.5">
          <button
            type="button"
            className="inline-flex flex-col items-center justify-center rounded-xl px-2 py-1.5 text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.65)]"
          >
            <PlayIcon />
            <span className="mt-0.5 text-[10px] font-semibold leading-none">Feed</span>
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("open-mobile-filters"))}
            className="inline-flex flex-col items-center justify-center rounded-xl px-2 py-1.5 text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.65)]"
          >
            <FilterIcon />
            <span className="mt-0.5 text-[10px] font-semibold leading-none">Filter</span>
          </button>
          <Link
            href="/dashboard/sell"
            className="inline-flex flex-col items-center justify-center rounded-xl px-2 py-1.5 text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.65)]"
          >
            <PlusIcon />
            <span className="mt-0.5 text-[10px] font-semibold leading-none">Add</span>
          </Link>
          <Link
            href={profileHref}
            className="inline-flex flex-col items-center justify-center rounded-xl px-2 py-1.5 text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.65)]"
          >
            <UserIcon />
            <span className="mt-0.5 text-[10px] font-semibold leading-none">Profile</span>
          </Link>
        </div>
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

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m9 7 8 5-8 5V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
