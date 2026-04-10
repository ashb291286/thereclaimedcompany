import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { SearchForm } from "./SearchForm";
import { BrowseSortSelect } from "./BrowseSortSelect";
import { BuyerWelcomeModal } from "./BuyerWelcomeModal";
import { CONDITION_LABELS } from "@/lib/constants";
import { parseBrowseRadiusParam } from "@/lib/browse-radius";
import { browseListingTypeQueryParam, browseSortQueryParam, searchListings } from "@/lib/listing-search";
import { formatUkLocationLine } from "@/lib/postcode-uk";
import { formatMiles } from "@/lib/geo";
import { buyerGrossPenceFromSellerNetPence, sellerChargesVat, vatLabelSuffix } from "@/lib/vat-pricing";
import { parseStoredCarbonImpact } from "@/lib/carbon/listing";
import { CarbonBadge } from "@/components/CarbonBadge";
import { BrowseListingPriceLine } from "@/components/currency/BrowseListingPriceLine";
import { BrowseMobileReels, type ReelListing } from "./BrowseMobileReels";
import type { SearchListingRow } from "@/lib/listing-search";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ sellerType?: string }>;
}): Promise<Metadata> {
  const p = await searchParams;
  if (p.sellerType === "reclamation_yard") {
    return {
      title: "Reclamation yards near me | Browse UK salvage yards",
      description:
        "Find reclamation yards by UK postcode and search radius. Browse salvage and reclaimed listings from yards across the country.",
    };
  }
  return {
    title: "Browse listings",
    description: "Search active reclaimed and salvage listings on The Reclaimed Company.",
  };
}

function auctionCountdownLabel(endsAt: Date | null): string | null {
  if (!endsAt) return null;
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

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoryId?: string;
    postcode?: string;
    radius?: string;
    sellerType?: string;
    hireOnly?: string;
    availableNow?: string;
    page?: string;
    ids?: string;
    fromImage?: string;
    welcome?: string;
    sort?: string;
    listingType?: string;
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

  const { miles: radiusMiles, nationwide: radiusNationwide } = parseBrowseRadiusParam(params.radius);

  const session = await auth();
  const userPrefs = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          registrationIntent: true,
          buyerWelcomeCompletedAt: true,
          homePostcode: true,
          homeLat: true,
          homeLng: true,
        },
      })
    : null;

  const nearestAvailable =
    Boolean(params.postcode?.trim()) ||
    (userPrefs?.homeLat != null &&
      userPrefs?.homeLng != null &&
      Number.isFinite(userPrefs.homeLat) &&
      Number.isFinite(userPrefs.homeLng));

  const sortQuery = browseSortQueryParam(params.sort, nearestAvailable);
  const listingTypeQuery = browseListingTypeQueryParam(params.listingType);

  const [searchResult, categories] = await Promise.all([
    searchListings({
      q: params.q,
      categoryId: params.categoryId,
      sellerType: params.sellerType,
      hireOnly: params.hireOnly === "1",
      availableNow: params.availableNow === "1",
      listingType: params.listingType,
      postcode: params.postcode,
      radiusMiles,
      radiusNationwide,
      idList: idList.length > 0 ? idList : undefined,
      skip,
      take: pageSize,
      viewerHomeLat: userPrefs?.homeLat ?? undefined,
      viewerHomeLng: userPrefs?.homeLng ?? undefined,
      viewerHomePostcode: userPrefs?.homePostcode ?? undefined,
      sort: params.sort,
    }),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
    }),
  ]);

  const {
    listings: listingsOrdered,
    total,
    sortByDistance,
    searchOriginPostcode,
    usingSavedHomeForDistance,
    distanceNotePostcode,
  } = searchResult;

  const showBuyerWelcome =
    params.welcome === "1" &&
    !!session?.user?.id &&
    userPrefs?.registrationIntent === "buying" &&
    !userPrefs?.buyerWelcomeCompletedAt;

  const totalPages = Math.ceil(total / pageSize);
  const fromImage = params.fromImage === "1";
  const yardsBrowse = params.sellerType === "reclamation_yard";

  const paramRecord: Record<string, string | undefined> = {
    q: params.q,
    categoryId: params.categoryId,
    postcode: params.postcode,
    radius:
      params.radius?.trim() ||
      (params.postcode?.trim()
        ? radiusNationwide
          ? "nationwide"
          : String(radiusMiles)
        : undefined),
    sellerType: params.sellerType,
    hireOnly: params.hireOnly,
    availableNow: params.availableNow,
    ids: params.ids,
    fromImage: params.fromImage,
    sort: sortQuery || undefined,
    listingType: listingTypeQuery || undefined,
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
    const v = sellerChargesVat({
      sellerRole: l.seller.role,
      vatRegistered: l.seller.sellerProfile?.vatRegistered,
    });
    const buyerPence = buyerGrossPenceFromSellerNetPence(l.price, v);
    const vatBit = vatLabelSuffix(v);
    return {
      id: l.id,
      title: l.title,
      imageUrl: l.images[0] ?? null,
      auctionEndsAtIso: l.auctionEndsAt ? l.auctionEndsAt.toISOString() : null,
      buyerPenceGbp: buyerPence,
      vatSuffix: vatBit,
      freeToCollectPrice: l.listingKind === "sell" && l.freeToCollector,
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
      locationNote = `Sorted by distance from ${searchOriginPostcode} (${radiusNationwide ? "nationwide" : `within ${radiusMiles} mi`}). Listings need coordinates — older ones may be missing until edited.`;
    } else if (!searchOriginPostcode && !idList.length) {
      locationNote =
        "That postcode wasn’t recognised; showing listings whose postcode starts with your search instead.";
    } else if (searchOriginPostcode && idList.length) {
      locationNote = `Distances from ${searchOriginPostcode} (photo-matched order kept).`;
    }
  } else if (usingSavedHomeForDistance && distanceNotePostcode) {
    if (sortByDistance && !params.postcode?.trim()) {
      locationNote = `Sorted by distance from ${distanceNotePostcode} (${radiusNationwide ? "nationwide" : `within ${radiusMiles} mi`}). Listings need coordinates — older ones may be missing until edited.`;
    } else {
      locationNote = `Approximate distance from your saved postcode (${distanceNotePostcode}). Listings need coordinates — older ones may not show miles until the seller adds them.`;
    }
  }

  return (
    <div className="mx-auto w-full overflow-x-hidden px-[30px] py-6 sm:py-8">
      {showBuyerWelcome ? (
        <Suspense fallback={null}>
          <BuyerWelcomeModal open />
        </Suspense>
      ) : null}
      <h1 className="text-2xl font-semibold text-zinc-900">
        {yardsBrowse ? "Reclamation yards near me" : "Browse listings"}
      </h1>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-24">
          {fromImage ? (
            <p className="mb-3 rounded-lg border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-zinc-900">
              Showing listings ranked by visual similarity to your photo. Use location, keywords, or category below to narrow results.
            </p>
          ) : null}
          <SearchForm
            id="search-filters"
            categories={categories}
            defaultQ={params.q}
            defaultCategoryId={params.categoryId}
            defaultPostcode={params.postcode?.trim() ? params.postcode : userPrefs?.homePostcode ?? undefined}
            defaultRadius={params.postcode?.trim() ? params.radius?.trim() || "50" : params.radius?.trim() || ""}
            defaultSellerType={params.sellerType}
            defaultHireOnly={params.hireOnly === "1"}
            defaultAvailableNow={params.availableNow === "1"}
            defaultListingType={listingTypeQuery}
            yardsBrowseMode={yardsBrowse}
          />
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-sm font-semibold text-zinc-900">Have something to sell?</p>
            <p className="mt-1 text-sm text-zinc-600">
              Post your reclaimed items in minutes and reach buyers and yards across the UK.
            </p>
            <Link
              href="/dashboard/sell"
              className="mt-3 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
            >
              List your item
            </Link>
          </div>
        </aside>

        <section>
          {locationNote ? (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              {locationNote}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              {total} listing{total !== 1 ? "s" : ""} found
            </p>
            <Suspense fallback={null}>
              <BrowseSortSelect value={sortQuery} nearestAvailable={nearestAvailable} />
            </Suspense>
          </div>
          {total > 0 ? (
            <p className="mt-1 text-xs text-zinc-500 md:hidden">
              Swipe cards vertically — full-screen previews, then open a listing.
            </p>
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
                  postcode: params.postcode,
                  radius:
                    params.radius?.trim() ||
                    (params.postcode?.trim()
                      ? radiusNationwide
                        ? "nationwide"
                        : String(radiusMiles)
                      : undefined),
                  sellerType: params.sellerType,
                  hireOnly: params.hireOnly,
                  availableNow: params.availableNow,
                  ids: params.ids,
                  fromImage: params.fromImage,
                  sort: sortQuery || undefined,
                  listingType: listingTypeQuery || undefined,
                }}
                profileHref={session?.user?.id ? "/dashboard" : "/auth/signin?callbackUrl=%2Fsearch"}
              />
              <ul className="mt-6 hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {listingsOrdered.map((l) => {
                  const impact = parseStoredCarbonImpact(l);
                  const auctionCountdown = l.listingKind === "auction" ? auctionCountdownLabel(l.auctionEndsAt) : null;
                  const gridVat = sellerChargesVat({
                    sellerRole: l.seller.role,
                    vatRegistered: l.seller.sellerProfile?.vatRegistered,
                  });
                  const gridBuyerPence = buyerGrossPenceFromSellerNetPence(l.price, gridVat);
                  const gridVatBit = vatLabelSuffix(gridVat);
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/listings/${l.id}`}
                        className="block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-brand/40"
                      >
                        <div className="relative aspect-square bg-zinc-200">
                          {auctionCountdown ? (
                            <span className="absolute right-2 top-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                              {auctionCountdown}
                            </span>
                          ) : null}
                          {l.images[0] ? (
                            <Image
                              src={l.images[0]}
                              alt={l.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-zinc-400">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="mb-1 flex min-h-[18px] flex-wrap content-start items-start gap-1">
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
                          <BrowseListingPriceLine
                            listingKind={l.listingKind}
                            freeToCollector={l.freeToCollector}
                            buyerPenceGbp={gridBuyerPence}
                            vatSuffix={gridVatBit}
                            categoryName={l.category.name}
                            conditionExtra={l.condition ? ` · ${CONDITION_LABELS[l.condition]}` : ""}
                          />
                          {(() => {
                            const locLine = formatUkLocationLine({
                              postcodeLocality: l.postcodeLocality,
                              adminDistrict: l.adminDistrict,
                              region: l.region,
                              postcode: l.postcode,
                            });
                            return locLine ? (
                              <p className="mt-1 truncate text-xs text-zinc-500">{locLine}</p>
                            ) : null;
                          })()}
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
        </section>
      </div>
      {totalPages > 1 && (
        <div className="mt-8 hidden justify-center gap-2 md:flex lg:ml-[280px]">
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
