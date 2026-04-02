import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { SearchForm } from "./SearchForm";
import { CONDITION_LABELS } from "@/lib/constants";
import { searchListings } from "@/lib/listing-search";
import { formatMiles } from "@/lib/geo";
import { parseStoredCarbonImpact } from "@/lib/carbon/listing";
import { CarbonBadge } from "@/components/CarbonBadge";
import { BrowseMobileReels, type ReelListing } from "./BrowseMobileReels";
import type { SearchListingRow } from "@/lib/listing-search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoryId?: string;
    condition?: string;
    postcode?: string;
    radius?: string;
    sellerType?: string;
    page?: string;
    ids?: string;
    fromImage?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 12;
  const skip = (page - 1) * pageSize;

  const idList =
    params.ids
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 48) ?? [];

  const radiusRaw = parseInt(params.radius ?? "50", 10);
  const radiusMiles = Number.isFinite(radiusRaw)
    ? Math.min(100, Math.max(5, radiusRaw))
    : 50;

  const [searchResult, categories, session] = await Promise.all([
    searchListings({
      q: params.q,
      categoryId: params.categoryId,
      condition: params.condition,
      sellerType: params.sellerType,
      postcode: params.postcode,
      radiusMiles,
      idList: idList.length > 0 ? idList : undefined,
      skip,
      take: pageSize,
    }),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
    }),
    auth(),
  ]);

  const { listings: listingsOrdered, total, sortByDistance, searchOriginPostcode } = searchResult;

  const totalPages = Math.ceil(total / pageSize);
  const fromImage = params.fromImage === "1";

  const paramRecord: Record<string, string | undefined> = {
    q: params.q,
    categoryId: params.categoryId,
    condition: params.condition,
    postcode: params.postcode,
    radius: params.radius ?? (params.postcode?.trim() ? String(radiusMiles) : undefined),
    sellerType: params.sellerType,
    ids: params.ids,
    fromImage: params.fromImage,
  };

  function paginationQuery(pageNum: number) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(paramRecord)) {
      if (v != null && String(v) !== "") sp.set(k, String(v));
    }
    sp.set("page", String(pageNum));
    return sp.toString();
  }

  function toReelListing(l: SearchListingRow): ReelListing {
    const carbon = parseStoredCarbonImpact(l);
    const priceLine =
      l.listingKind === "sell" && l.freeToCollector
        ? "Free to collect"
        : l.listingKind === "auction"
          ? `From £${(l.price / 100).toFixed(2)}`
          : `£${(l.price / 100).toFixed(2)}`;
    return {
      id: l.id,
      title: l.title,
      imageUrl: l.images[0] ?? null,
      priceLine,
      categoryName: l.category.name,
      conditionLabel: CONDITION_LABELS[l.condition],
      listingKind: l.listingKind,
      freeToCollector: l.freeToCollector,
      offersDelivery: l.offersDelivery,
      distanceLabel: l.distanceMiles != null ? formatMiles(l.distanceMiles) : null,
      carbonSavedKg: carbon?.carbon_saved_kg ?? null,
    };
  }

  const reelListings = listingsOrdered.map(toReelListing);

  let locationNote: string | null = null;
  if (params.postcode?.trim()) {
    if (sortByDistance && searchOriginPostcode) {
      locationNote = `Sorted by distance from ${searchOriginPostcode} (within ${radiusMiles} mi). Listings need coordinates — older ones may be missing until edited.`;
    } else if (!searchOriginPostcode && !idList.length) {
      locationNote =
        "That postcode wasn’t recognised; showing listings whose postcode starts with your search instead.";
    } else if (searchOriginPostcode && idList.length) {
      locationNote = `Distances from ${searchOriginPostcode} (photo-matched order kept).`;
    }
  }

  return (
    <div className="mx-auto max-w-6xl overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Browse listings</h1>
      {fromImage ? (
        <p className="mt-3 rounded-lg border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-zinc-900">
          Showing listings ranked by visual similarity to your photo. Add keywords or filters below to narrow results.
        </p>
      ) : null}
      <SearchForm
        id="search-filters"
        categories={categories}
        defaultQ={params.q}
        defaultCategoryId={params.categoryId}
        defaultCondition={params.condition}
        defaultPostcode={params.postcode}
        defaultRadius={String(radiusMiles)}
        defaultSellerType={params.sellerType}
      />
      {locationNote ? (
        <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          {locationNote}
        </p>
      ) : null}
      <p className="mt-4 text-sm text-zinc-500">
        {total} listing{total !== 1 ? "s" : ""} found
      </p>
      {total > 0 ? (
        <p className="mt-1 text-xs text-zinc-500 md:hidden">Swipe cards vertically — full-screen previews, then open a listing.</p>
      ) : null}
      {listingsOrdered.length === 0 ? (
        <p className="mt-8 text-zinc-500">No listings match your filters.</p>
      ) : (
        <>
          <BrowseMobileReels
            listings={reelListings}
            initialPage={page}
            totalPages={totalPages}
            query={{
              q: params.q,
              categoryId: params.categoryId,
              condition: params.condition,
              postcode: params.postcode,
              radius: params.radius ?? (params.postcode?.trim() ? String(radiusMiles) : undefined),
              sellerType: params.sellerType,
              ids: params.ids,
              fromImage: params.fromImage,
            }}
            profileHref={session?.user?.id ? "/dashboard" : "/auth/signin?callbackUrl=%2Fsearch"}
          />
          <ul className="mt-6 hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listingsOrdered.map((l) => {
              const impact = parseStoredCarbonImpact(l);
              return (
                <li key={l.id}>
                  <Link
                    href={`/listings/${l.id}`}
                    className="block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-brand/40"
                  >
                    <div className="relative aspect-square bg-zinc-200">
                      {l.images[0] ? (
                        <Image
                          src={l.images[0]}
                          alt={l.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-400">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="mb-1 flex flex-wrap gap-1">
                        {l.listingKind === "auction" && (
                          <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">
                            Auction
                          </span>
                        )}
                        {l.listingKind === "sell" && l.freeToCollector && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-900">
                            Free
                          </span>
                        )}
                        {l.offersDelivery && (
                          <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-900">
                            Delivers
                          </span>
                        )}
                        {l.distanceMiles != null && (
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700">
                            {formatMiles(l.distanceMiles)}
                          </span>
                        )}
                      </div>
                      <p className="truncate font-medium text-zinc-900">{l.title}</p>
                      <p className="text-sm text-zinc-500">
                        {l.listingKind === "sell" && l.freeToCollector
                          ? `Free to collect · ${l.category.name}`
                          : l.listingKind === "auction"
                            ? `From £${(l.price / 100).toFixed(2)} · ${l.category.name}`
                            : `£${(l.price / 100).toFixed(2)} · ${l.category.name}`}
                        {l.condition ? ` · ${CONDITION_LABELS[l.condition]}` : ""}
                      </p>
                      {(l.adminDistrict || l.region || l.postcode) && (
                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {[l.adminDistrict, l.region].filter(Boolean).join(" · ")}
                          {l.postcode ? ` · ${l.postcode}` : ""}
                        </p>
                      )}
                      {impact ? (
                        <div className="mt-2">
                          <CarbonBadge impact={impact} variant="compact" />
                        </div>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {totalPages > 1 && (
        <div className="mt-8 hidden justify-center gap-2 md:flex">
          {page > 1 && (
            <Link
              href={`/search?${paginationQuery(page - 1)}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Previous
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-zinc-600">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/search?${paginationQuery(page + 1)}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
