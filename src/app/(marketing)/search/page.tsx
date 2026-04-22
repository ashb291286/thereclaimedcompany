import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { SearchForm } from "./SearchForm";
import { BrowseSortSelect } from "./BrowseSortSelect";
import { BuyerWelcomeModal } from "./BuyerWelcomeModal";
import { CONDITION_LABELS } from "@/lib/constants";
import { parseBrowseRadiusParam } from "@/lib/browse-radius";
import { browseListingTypeQueryParam, browseSortQueryParam, searchListings } from "@/lib/listing-search";
import { formatUkLocationLine, lookupUkPostcode } from "@/lib/postcode-uk";
import { formatMiles, haversineMiles } from "@/lib/geo";
import { buyerGrossPenceFromSellerNetPence, sellerChargesVat, vatLabelSuffix } from "@/lib/vat-pricing";
import { parseStoredCarbonImpact } from "@/lib/carbon/listing";
import { CarbonBadge } from "@/components/CarbonBadge";
import { BrowseListingPriceLine } from "@/components/currency/BrowseListingPriceLine";
import { resolveCategoryBrowseRow } from "@/lib/category-browse";
import { BrowseListingGrid } from "./BrowseListingGrid";
import { BrowseMobileReels, type ReelListing } from "./BrowseMobileReels";
import { MobileFiltersDrawer } from "./MobileFiltersDrawer";
import type { SearchListingRow } from "@/lib/listing-search";
import { proxiedListingImageSrc } from "@/lib/listing-image-url";
import { publicSellerPath } from "@/lib/yard-public-path";

const DEFAULT_DEALER_FALLBACK_IMAGE_PATH = "/images/dealer-fallback.png";
const DEFAULT_YARD_FALLBACK_IMAGE_PATH = "/images/yard-header-default.png";

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
  if (p.sellerType === "dealer") {
    return {
      title: "Antiques dealers near me | Browse UK antiques dealers",
      description:
        "Find antiques dealers by UK postcode and search radius. Browse reclaimed and antique listings from dealers across the country.",
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
    category?: string;
    categoryId?: string;
    postcode?: string;
    radius?: string;
    sellerType?: string;
    hireOnly?: string;
    availableNow?: string;
    page?: string;
    sellerPage?: string;
    ids?: string;
    fromImage?: string;
    welcome?: string;
    sort?: string;
    listingType?: string;
  }>;
}) {
  const params = await searchParams;
  const categoryRaw = params.category?.trim() || params.categoryId?.trim();
  const activeCategoryRow = await resolveCategoryBrowseRow(categoryRaw || undefined);
  if (params.categoryId?.trim() && !params.category?.trim() && activeCategoryRow) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "categoryId") continue;
      if (v === undefined || v === null || v === "") continue;
      sp.set(k, String(v));
    }
    sp.set("category", activeCategoryRow.slug);
    redirect(`/search?${sp.toString()}`);
  }
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 15;
  const skip = (page - 1) * pageSize;
  const sellerPage = Math.max(1, parseInt(params.sellerPage ?? "1", 10));
  const sellerPageSize = 12;
  const sellerFocusedBrowse =
    params.sellerType === "reclamation_yard"
      ? "reclamation_yard"
      : params.sellerType === "dealer"
        ? "dealer"
        : null;

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

  const sellerDirectoryMode = sellerFocusedBrowse !== null && !activeCategoryRow;

  const [searchResult, categories, sellerProfiles] = await Promise.all([
    sellerDirectoryMode
      ? Promise.resolve(null)
      : searchListings({
          q: params.q,
          categoryId: activeCategoryRow?.id ?? params.categoryId,
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
    sellerFocusedBrowse
      ? prisma.sellerProfile.findMany({
          where: {
            user: { role: sellerFocusedBrowse },
            ...(sellerFocusedBrowse === "reclamation_yard"
              ? { yardSlug: { not: null } }
              : {}),
            ...(params.q?.trim()
              ? {
                  OR: [
                    { displayName: { contains: params.q.trim(), mode: "insensitive" } },
                    { businessName: { contains: params.q.trim(), mode: "insensitive" } },
                    { postcode: { contains: params.q.trim(), mode: "insensitive" } },
                    { postcodeLocality: { contains: params.q.trim(), mode: "insensitive" } },
                    { adminDistrict: { contains: params.q.trim(), mode: "insensitive" } },
                    { region: { contains: params.q.trim(), mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          orderBy: [{ updatedAt: "desc" }],
          take: 80,
          select: {
            id: true,
            userId: true,
            displayName: true,
            businessName: true,
            yardSlug: true,
            yardTagline: true,
            yardLogoUrl: true,
            yardHeaderImageUrl: true,
            postcode: true,
            lat: true,
            lng: true,
            postcodeLocality: true,
            adminDistrict: true,
            region: true,
            user: { select: { role: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const listingsOrdered = searchResult?.listings ?? [];
  const total = searchResult?.total ?? 0;
  const sortByDistance = searchResult?.sortByDistance ?? false;
  const searchOriginPostcode = searchResult?.searchOriginPostcode ?? null;
  const usingSavedHomeForDistance = searchResult?.usingSavedHomeForDistance ?? false;
  const distanceNotePostcode = searchResult?.distanceNotePostcode ?? null;

  const showBuyerWelcome =
    params.welcome === "1" &&
    !!session?.user?.id &&
    userPrefs?.registrationIntent === "buying" &&
    !userPrefs?.buyerWelcomeCompletedAt;

  const totalPages = Math.ceil(total / pageSize);
  const fromImage = params.fromImage === "1";
  const sellerIdsForDirectory = sellerDirectoryMode ? sellerProfiles.map((s) => s.userId) : [];

  const originForSellerDistance = (() => {
    if (params.postcode?.trim()) return { mode: "postcode" as const, postcode: params.postcode.trim() };
    if (userPrefs?.homeLat != null && userPrefs?.homeLng != null) {
      return { mode: "home" as const, lat: userPrefs.homeLat, lng: userPrefs.homeLng };
    }
    return null;
  })();

  const originCoords =
    originForSellerDistance?.mode === "postcode"
      ? await lookupUkPostcode(originForSellerDistance.postcode)
      : originForSellerDistance?.mode === "home"
        ? { postcode: userPrefs?.homePostcode ?? "", lat: originForSellerDistance.lat, lng: originForSellerDistance.lng }
        : null;

  const listingCounts =
    sellerDirectoryMode && sellerIdsForDirectory.length
      ? await prisma.listing.groupBy({
          by: ["sellerId"],
          where: {
            sellerId: { in: sellerIdsForDirectory },
            status: "active",
            visibleOnMarketplace: true,
          },
          _count: { _all: true },
        })
      : [];
  const listingCountBySellerId = new Map(listingCounts.map((r) => [r.sellerId, r._count._all]));
  const sellerCards = sellerDirectoryMode
    ? sellerProfiles
        .map((s) => {
          const distanceMiles =
            originCoords && s.lat != null && s.lng != null
              ? haversineMiles(originCoords.lat, originCoords.lng, s.lat, s.lng)
              : null;
          return {
            ...s,
            distanceMiles,
            listingCount: listingCountBySellerId.get(s.userId) ?? 0,
          };
        })
        .filter((s) => {
          if (!originCoords || radiusNationwide) return true;
          if (s.distanceMiles == null) return false;
          return s.distanceMiles <= radiusMiles;
        })
        .sort((a, b) => (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999))
    : [];
  const sellerCardsShown = sellerCards.slice(0, sellerPage * sellerPageSize);
  const hasMoreSellerCards = sellerCards.length > sellerCardsShown.length;

  const paramRecord: Record<string, string | undefined> = {
    q: params.q,
    ...(activeCategoryRow ? { category: activeCategoryRow.slug } : {}),
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
      imageUrl: l.images[0] ? proxiedListingImageSrc(l.images[0]) : null,
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
    <div className="mx-auto w-full overflow-x-hidden px-0 py-0 md:px-[30px] md:py-8">
      {showBuyerWelcome ? (
        <Suspense fallback={null}>
          <BuyerWelcomeModal open />
        </Suspense>
      ) : null}
      <h1 className="hidden text-2xl font-semibold text-zinc-900 md:block">
        {sellerFocusedBrowse === "reclamation_yard"
          ? "Reclamation yards near me"
          : sellerFocusedBrowse === "dealer"
            ? "Dealers near me"
            : "Browse listings"}
      </h1>
      <div className="mt-1 grid grid-cols-1 gap-6 md:mt-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="hidden lg:sticky lg:top-24 lg:block">
          {fromImage ? (
            <p className="mb-3 rounded-lg border border-brand/20 bg-brand-soft px-4 py-3 text-sm text-zinc-900">
              Showing listings ranked by visual similarity to your photo. Use location, keywords, or category below to narrow results.
            </p>
          ) : null}
          <SearchForm
            id="search-filters"
            categories={categories}
            defaultQ={params.q}
            defaultCategorySlug={activeCategoryRow?.slug ?? ""}
            defaultPostcode={params.postcode?.trim() ? params.postcode : userPrefs?.homePostcode ?? undefined}
            defaultRadius={params.postcode?.trim() ? params.radius?.trim() || "50" : params.radius?.trim() || ""}
            defaultSellerType={params.sellerType}
            defaultHireOnly={params.hireOnly === "1"}
            defaultAvailableNow={params.availableNow === "1"}
            defaultListingType={listingTypeQuery}
            sellerFocusedBrowseMode={sellerFocusedBrowse}
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

        <section className="px-4 md:px-0">
          {locationNote ? (
            <p className="hidden rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 md:block">
              {locationNote}
            </p>
          ) : null}
          <div className="mt-4 hidden flex-wrap items-center justify-between gap-3 md:flex">
            <p className="text-sm text-zinc-500">
              {sellerDirectoryMode
                ? `${sellerCards.length} ${sellerFocusedBrowse === "reclamation_yard" ? "yard" : "dealer"}${sellerCards.length !== 1 ? "s" : ""} found`
                : `${total} listing${total !== 1 ? "s" : ""} found`}
            </p>
            <Suspense fallback={null}>
              <BrowseSortSelect value={sortQuery} nearestAvailable={nearestAvailable} />
            </Suspense>
          </div>
          {sellerDirectoryMode ? (
            <div id="seller-cards" className="mt-6 scroll-mt-24">
              {sellerCards.length === 0 ? (
                <p className="px-4 text-sm text-zinc-600 md:px-0">
                  No {sellerFocusedBrowse === "reclamation_yard" ? "reclamation yards" : "dealers"} matched these filters.
                </p>
              ) : (
                <>
                  <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {sellerCardsShown.map((s) => {
                      const href = publicSellerPath({
                        sellerId: s.userId,
                        role: s.user.role,
                        yardSlug: s.yardSlug,
                      });
                  const roleFallback =
                    s.user.role === "dealer"
                      ? DEFAULT_DEALER_FALLBACK_IMAGE_PATH
                      : DEFAULT_YARD_FALLBACK_IMAGE_PATH;
                  const img = s.yardHeaderImageUrl || s.yardLogoUrl || roleFallback;
                      return (
                        <li key={s.id}>
                          <Link
                            href={href}
                            className="block overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:border-brand/35 hover:shadow-sm"
                          >
                            <div className="relative aspect-square bg-zinc-100">
                              <Image
                                src={img}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                unoptimized
                              />
                            </div>
                            <div className="p-3">
                              <p className="truncate font-semibold text-zinc-900">{s.displayName}</p>
                              {s.businessName && s.businessName !== s.displayName ? (
                                <p className="truncate text-sm text-zinc-600">{s.businessName}</p>
                              ) : null}
                              <p className="mt-1 truncate text-xs text-zinc-500">
                                {formatUkLocationLine({
                                  postcodeLocality: s.postcodeLocality,
                                  adminDistrict: s.adminDistrict,
                                  region: s.region,
                                  postcode: s.postcode,
                                })}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                                {s.distanceMiles != null ? (
                                  <span className="rounded bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">
                                    {formatMiles(s.distanceMiles)} away
                                  </span>
                                ) : null}
                                <span className="rounded bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700">
                                  {s.listingCount} listing{s.listingCount === 1 ? "" : "s"}
                                </span>
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  {hasMoreSellerCards ? (
                    <div className="mt-6 flex justify-center">
                      <Link
                        href={`/search?${(() => {
                          const sp = new URLSearchParams();
                          for (const [k, v] of Object.entries(paramRecord)) {
                            if (v != null && String(v) !== "") sp.set(k, String(v));
                          }
                          sp.set("sellerPage", String(sellerPage + 1));
                          return sp.toString();
                        })()}#seller-cards`}
                        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                      >
                        Load more
                      </Link>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : listingsOrdered.length === 0 ? (
            <p className="mt-8 px-4 text-zinc-500 md:px-0">No listings match your filters.</p>
          ) : (
            <>
              {!activeCategoryRow ? (
                <BrowseMobileReels
                  listings={reelListings}
                  initialPage={page}
                  totalPages={totalPages}
                  query={{
                    q: params.q,
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
                  initialSearch={params.q}
                  gridListings={listingsOrdered}
                  enableSwipeCardsToggle
                />
              ) : null}
              <MobileFiltersDrawer>
                <SearchForm
                  id="search-filters-mobile"
                  categories={categories}
                  defaultQ={params.q}
                  defaultCategorySlug={activeCategoryRow?.slug ?? ""}
                  defaultPostcode={params.postcode?.trim() ? params.postcode : userPrefs?.homePostcode ?? undefined}
                  defaultRadius={params.postcode?.trim() ? params.radius?.trim() || "50" : params.radius?.trim() || ""}
                  defaultSellerType={params.sellerType}
                  defaultHireOnly={params.hireOnly === "1"}
                  defaultAvailableNow={params.availableNow === "1"}
                  defaultListingType={listingTypeQuery}
                  sellerFocusedBrowseMode={sellerFocusedBrowse}
                />
              </MobileFiltersDrawer>
              <BrowseListingGrid
                listings={listingsOrdered}
                visibility={activeCategoryRow ? "always" : "md-only"}
              />
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
