"use client";

import Image from "next/image";
import Link from "next/link";
import { CONDITION_LABELS } from "@/lib/constants";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDisplayCurrency } from "@/components/currency/CurrencyProvider";

export type ReelListing = {
  id: string;
  title: string;
  imageUrl: string | null;
  auctionEndsAtIso: string | null;
  buyerPenceGbp: number;
  vatSuffix: string;
  freeToCollectPrice: boolean;
  categoryName: string;
  conditionLabel: string;
  listingKind: "sell" | "auction";
  freeToCollector: boolean;
  offersDelivery: boolean;
  distanceLabel: string | null;
  carbonSavedKg: number | null;
};

type FeedQuery = {
  q?: string;
  categoryId?: string;
  condition?: string;
  postcode?: string;
  radius?: string;
  sellerType?: string;
  conditionGrade?: string;
  era?: string;
  genre?: string;
  setting?: string;
  material?: string;
  hireOnly?: string;
  availableNow?: string;
  ids?: string;
  fromImage?: string;
};

type ApiListingRow = {
  id: string;
  title: string;
  images: string[];
  auctionEndsAt?: string | null;
  price: number;
  category: { name: string };
  condition: keyof typeof CONDITION_LABELS;
  listingKind: "sell" | "auction";
  freeToCollector: boolean;
  offersDelivery: boolean;
  distanceMiles: number | null;
  carbonImpactJson?: unknown;
  carbonSavedKg?: number | null;
};

function milesLabel(m: number): string {
  if (!Number.isFinite(m)) return "";
  if (m < 1) return "<1 mi";
  if (m < 10) return `${m.toFixed(1)} mi`;
  return `${Math.round(m)} mi`;
}

function toReelListing(l: ApiListingRow): ReelListing {
  const carbon = parseCarbonSavedKg(l.carbonImpactJson, l.carbonSavedKg ?? null);
  const freeToCollectPrice = l.listingKind === "sell" && l.freeToCollector;
  return {
    id: l.id,
    title: l.title,
    imageUrl: l.images[0] ?? null,
    auctionEndsAtIso: l.auctionEndsAt ?? null,
    buyerPenceGbp: l.price,
    vatSuffix: "",
    freeToCollectPrice,
    categoryName: l.category.name,
    conditionLabel: CONDITION_LABELS[l.condition] ?? "Used",
    listingKind: l.listingKind,
    freeToCollector: l.freeToCollector,
    offersDelivery: l.offersDelivery,
    distanceLabel: l.distanceMiles != null ? milesLabel(l.distanceMiles) : null,
    carbonSavedKg: carbon,
  };
}

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

/** Client-safe parser to avoid importing server-only carbon modules. */
function parseCarbonSavedKg(carbonImpactJson: unknown, carbonSavedKg: number | null): number | null {
  if (carbonImpactJson && typeof carbonImpactJson === "object") {
    const json = carbonImpactJson as Record<string, unknown>;
    if (typeof json.carbon_saved_kg === "number") return json.carbon_saved_kg;
  }
  return typeof carbonSavedKg === "number" ? carbonSavedKg : null;
}

export function BrowseMobileReels({
  listings,
  initialPage,
  totalPages,
  query,
  profileHref,
}: {
  listings: ReelListing[];
  initialPage: number;
  totalPages: number;
  query: FeedQuery;
  profileHref: string;
}) {
  const { formatPence } = useDisplayCurrency();
  const [items, setItems] = useState<ReelListing[]>(listings);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = page < totalPages;

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
    if (query.categoryId) sp.set("categoryId", query.categoryId);
    if (query.condition) sp.set("condition", query.condition);
    if (query.postcode) sp.set("postcode", query.postcode);
    if (query.radius) sp.set("radius", query.radius);
    if (query.sellerType) sp.set("sellerType", query.sellerType);
    if (query.conditionGrade) sp.set("conditionGrade", query.conditionGrade);
    if (query.era) sp.set("era", query.era);
    if (query.genre) sp.set("genre", query.genre);
    if (query.setting) sp.set("setting", query.setting);
    if (query.material) sp.set("material", query.material);
    if (query.hireOnly) sp.set("hireOnly", query.hireOnly);
    if (query.availableNow) sp.set("availableNow", query.availableNow);
    if (query.ids) sp.set("ids", query.ids);
    if (query.fromImage) sp.set("fromImage", query.fromImage);
    return sp.toString();
  }, [query]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadError(null);
    const nextPage = page + 1;
    try {
      const qs = new URLSearchParams(queryString);
      qs.set("page", String(nextPage));
      qs.set("pageSize", "12");
      const res = await fetch(`/api/listings?${qs.toString()}`, { method: "GET" });
      if (!res.ok) throw new Error("Failed to load listings");
      const data = (await res.json()) as { listings: ApiListingRow[]; page: number };
      const mapped = data.listings.map(toReelListing);
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
    if (!hasMore || !sentinelRef.current) return;
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
  }, [hasMore, loadMore]);

  if (items.length === 0) return null;

  return (
    <div
      className="md:hidden relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-3 pb-24 sm:px-4"
      aria-label="Swipe through listings"
    >
      <div
        className="mx-auto max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-y-contain snap-y snap-mandatory [scrollbar-width:thin]"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <ul className="flex flex-col gap-3 pt-1">
          {items.map((l) => {
            const auctionCountdown =
              l.listingKind === "auction" ? auctionCountdownLabelFromIso(l.auctionEndsAtIso) : null;
            return (
            <li
              key={l.id}
              className="relative h-[min(calc(100dvh-5.5rem),640px)] min-h-[22rem] w-full shrink-0 snap-start snap-always overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-900 shadow-2xl ring-1 ring-black/10"
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

              <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end p-4 pt-16 text-white">
                <div className="mb-2 flex min-h-[20px] flex-wrap content-start items-start gap-1.5">
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
          );
          })}
        </ul>
        <div ref={sentinelRef} className="h-12" />
        {loadingMore ? (
          <p className="pb-4 text-center text-xs text-zinc-500">Loading more listings…</p>
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
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200/90 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-2 backdrop-blur sm:px-4">
        <div className="mx-auto grid max-w-xl grid-cols-4 gap-1.5">
          <button
            type="button"
            className="rounded-xl bg-zinc-900 px-2 py-2.5 text-[11px] font-semibold text-white"
          >
            Feed
          </button>
          <button
            type="button"
            onClick={() => {
              const filters = document.getElementById("search-filters");
              filters?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="rounded-xl border border-zinc-300 bg-white px-2 py-2.5 text-[11px] font-semibold text-zinc-700"
          >
            Filters
          </button>
          <Link
            href="/dashboard/sell"
            className="rounded-xl border border-zinc-300 bg-white px-2 py-2.5 text-center text-[11px] font-semibold text-zinc-700"
          >
            Add listing
          </Link>
          <Link
            href={profileHref}
            className="rounded-xl border border-zinc-300 bg-white px-2 py-2.5 text-center text-[11px] font-semibold text-zinc-700"
          >
            Profile
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
