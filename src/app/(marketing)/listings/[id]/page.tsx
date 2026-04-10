import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { ListingCheckoutActions } from "./ListingCheckoutActions";
import { HaggleForm } from "./HaggleForm";
import { BidForm } from "./BidForm";
import { OfferRespond } from "./OfferRespond";
import { BuyerCounterRespond } from "./BuyerCounterRespond";
import { CONDITION_LABELS, LISTING_KIND_LABELS } from "@/lib/constants";
import {
  formatDeliveryOptionLine,
  type DeliveryOptionStored,
} from "@/lib/delivery-carriers";
import { minimumNextBidPence } from "@/lib/auction";
import { finalizeAuctionListing } from "@/lib/auction-settlement";
import { parseStoredCarbonImpact } from "@/lib/carbon/listing";
import { CarbonBadge, carbonSeoSentence } from "@/components/CarbonBadge";
import { ListingFavoriteButton } from "@/components/ListingFavoriteButton";
import { ListingFomoStrip } from "@/components/ListingFomoStrip";
import { buildSellerBadges } from "@/lib/seller-badges";
import { openingHoursCompactLine, scheduleFromDbField } from "@/lib/opening-hours";
import { publicSellerPath } from "@/lib/yard-public-path";
import {
  buyerGrossPenceFromSellerNetPence,
  sellerChargesVat,
  vatLabelSuffix,
} from "@/lib/vat-pricing";
import { ListingLocalYardsForOwner } from "@/components/ListingLocalYardsForOwner";
import { ListingPricingMode } from "@/lib/listing-client-enums";
import { DisplayPrice } from "@/components/currency/DisplayPrice";
import { AuctionWinCheckoutButton } from "./AuctionWinCheckoutButton";
import { ListingImageGallery } from "./ListingImageGallery";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id, status: "active" },
    select: {
      title: true,
      description: true,
      carbonImpactJson: true,
      carbonSavedKg: true,
      visibleOnMarketplace: true,
    },
  });
  if (!listing) return { title: "Listing" };
  if (!listing.visibleOnMarketplace) {
    return {
      title: listing.title,
      description: "Hire-only listing — not indexed for marketplace search.",
      robots: { index: false, follow: false },
    };
  }
  const carbonMeta = parseStoredCarbonImpact(listing);
  const desc =
    carbonMeta != null
      ? carbonSeoSentence(carbonMeta).slice(0, 160)
      : listing.description.slice(0, 160);
  return {
    title: listing.title,
    description: desc.slice(0, 160),
    openGraph: {
      title: listing.title,
      description: desc.slice(0, 160),
    },
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  await finalizeAuctionListing(id);

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      category: true,
      seller: { include: { sellerProfile: true } },
      propRentalOffer: {
        include: {
          bookings: {
            where: { status: { in: ["REQUESTED", "CONFIRMED", "OUT_ON_HIRE"] } },
            select: { id: true },
          },
          unavailability: {
            where: { endDate: { gte: new Date() } },
            select: { id: true },
          },
        },
      },
    },
  });
  if (!listing) notFound();

  const isOwner = session?.user?.id === listing.sellerId;
  if (!listing.visibleOnMarketplace && !isOwner) {
    notFound();
  }

  const topBid = await prisma.bid.findFirst({
    where: { listingId: id },
    orderBy: { amountPence: "desc" },
    include: { bidder: { select: { name: true, email: true } } },
  });

  if (listing.status === "draft") notFound();
  if (listing.status === "sold") notFound();
  if (listing.status === "ended" && !isOwner) notFound();
  if (listing.status === "payment_pending") {
    const winnerId = topBid?.bidderId;
    if (!isOwner && session?.user?.id !== winnerId) notFound();
  }
  if (
    listing.status !== "active" &&
    listing.status !== "payment_pending" &&
    listing.status !== "ended"
  ) {
    notFound();
  }

  const sellerProfile = listing.seller?.sellerProfile;
  const sellerHoursLine = sellerProfile
    ? openingHoursCompactLine(
        scheduleFromDbField(sellerProfile.openingHoursSchedule),
        sellerProfile.openingHours
      )
    : null;

  const sellerPublicHref = listing.seller
    ? publicSellerPath({
        sellerId: listing.sellerId,
        role: listing.seller.role,
        yardSlug: sellerProfile?.yardSlug ?? null,
      })
    : `/sellers/${listing.sellerId}`;

  const buyerBidPay =
    session?.user?.id && !isOwner
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { bidPaymentMethodId: true },
        })
      : null;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    recentBids,
    incomingOffers,
    myOffers,
    acceptedMine,
    sellerPaidSales,
    sellerActiveListings,
    views7d,
    favoriteCount,
    userFavorite,
  ] = await Promise.all([
    prisma.bid.findMany({
      where: { listingId: id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { bidder: { select: { name: true, email: true } } },
    }),
    isOwner
      ? prisma.offer.findMany({
          where: { listingId: id, status: "pending", fromSellerCounter: false },
          include: { buyer: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    session?.user?.id && !isOwner
      ? prisma.offer.findMany({
          where: { listingId: id, buyerId: session.user.id },
          orderBy: { updatedAt: "desc" },
          take: 15,
        })
      : Promise.resolve([]),
    session?.user?.id && !isOwner
      ? prisma.offer.findFirst({
          where: {
            listingId: id,
            buyerId: session.user.id,
            status: "accepted",
          },
        })
      : Promise.resolve(null),
    prisma.order.count({
      where: { sellerId: listing.sellerId, status: "paid" },
    }),
    prisma.listing.count({
      where: { sellerId: listing.sellerId, status: "active" },
    }),
    prisma.listingViewEvent.count({
      where: { listingId: id, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.listingFavorite.count({ where: { listingId: id } }),
    session?.user?.id
      ? prisma.listingFavorite.findUnique({
          where: {
            userId_listingId: { userId: session.user.id, listingId: id },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const now = new Date();
  const isAuction = listing.listingKind === "auction";
  const auctionEnded = Boolean(listing.auctionEndsAt && listing.auctionEndsAt <= now);
  const auctionLive = isAuction && !auctionEnded;
  const minNextPence = isAuction
    ? minimumNextBidPence(listing.price, topBid?.amountPence ?? null)
    : listing.price;
  const chargesVat = sellerChargesVat({
    sellerRole: listing.seller?.role,
    vatRegistered: sellerProfile?.vatRegistered,
  });
  const buyerListPricePence = buyerGrossPenceFromSellerNetPence(listing.price, chargesVat);
  const buyerMinNextPence = buyerGrossPenceFromSellerNetPence(minNextPence, chargesVat);
  const minNextPounds = buyerMinNextPence / 100;

  const userWonAuction =
    !!topBid &&
    session?.user?.id === topBid.bidderId &&
    listing.status === "payment_pending";

  const structuredDelivery: DeliveryOptionStored[] | null =
    Array.isArray(listing.deliveryOptions) && listing.deliveryOptions.length > 0
      ? (listing.deliveryOptions as DeliveryOptionStored[])
      : null;

  const carbonImpact = parseStoredCarbonImpact(listing);

  const sellerBadges = buildSellerBadges({
    paidSalesCount: sellerPaidSales,
    activeListingsCount: sellerActiveListings,
    role: listing.seller?.role ?? null,
    verificationStatus: sellerProfile?.verificationStatus ?? null,
    memberSince: listing.seller?.createdAt ?? new Date(0),
  });

  const sectionClass =
    "rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm sm:p-6";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:max-w-7xl lg:py-10">
      {isOwner && !listing.visibleOnMarketplace ? (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>Hire-only</strong> — this item is hidden from marketplace search and your public yard shop.
          Productions find it through{" "}
          <Link href="/prop-yard/search" className="font-medium text-amber-900 underline">
            The Prop Yard
          </Link>
          .
        </p>
      ) : null}
      <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-800">
          Home
        </Link>
        <span aria-hidden className="text-zinc-300">
          /
        </span>
        <Link href="/search" className="hover:text-zinc-800">
          Browse
        </Link>
        <span aria-hidden className="text-zinc-300">
          /
        </span>
        <Link
          href={`/search?categoryId=${listing.categoryId}`}
          className="hover:text-zinc-800"
        >
          {listing.category.name}
        </Link>
        <span aria-hidden className="text-zinc-300">
          /
        </span>
        <span className="line-clamp-1 font-medium text-zinc-700">{listing.title}</span>
      </nav>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div className="min-w-0 flex-1 lg:max-w-[min(100%,calc(100%-22rem))]">
          <div className={`${sectionClass} p-4 sm:p-5`}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Photos</p>
            <ListingImageGallery images={listing.images} title={listing.title} />
          </div>

          <section className={`${sectionClass} mt-5 sm:mt-6`}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">About this item</h2>
            {carbonImpact ? (
              <p className="mt-4 text-sm leading-relaxed text-emerald-900/90">{carbonSeoSentence(carbonImpact)}</p>
            ) : null}
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-700">
              {listing.description}
            </p>
          </section>

          {carbonImpact ? (
            <div className="mt-5 sm:mt-6">
              <CarbonBadge impact={carbonImpact} />
            </div>
          ) : null}
        </div>

        <aside className="w-full shrink-0 space-y-5 lg:w-[min(100%,22rem)] xl:w-96">
          <section className={sectionClass}>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Listing</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                {LISTING_KIND_LABELS[listing.listingKind]}
              </span>
              {listing.listingKind === "sell" && listing.freeToCollector && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Free to collector
                </span>
              )}
              {listing.offersDelivery && (
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-900">
                  Delivers
                </span>
              )}
              {carbonImpact ? <CarbonBadge impact={carbonImpact} variant="pill" /> : null}
            </div>
            <ListingFomoStrip
              listingId={id}
              views7d={views7d}
              favoriteCount={favoriteCount}
              isOwner={isOwner}
            />
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold leading-snug text-zinc-900 sm:text-2xl">
                  {listing.title}
                </h1>
                {listing.sellerReference?.trim() ? (
                  <p className="mt-1.5 text-sm text-zinc-600">
                    <span className="font-medium text-zinc-800">Reference</span>{" "}
                    <span className="font-mono text-zinc-700">{listing.sellerReference.trim()}</span>
                  </p>
                ) : null}
              </div>
              <ListingFavoriteButton
                listingId={id}
                initialFavorited={!!userFavorite}
                isLoggedIn={!!session?.user?.id}
                isOwner={isOwner}
              />
            </div>
            {listing.listingKind === "sell" && !listing.freeToCollector && (
              <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">
                <DisplayPrice penceGbp={buyerListPricePence} suffix={vatLabelSuffix(chargesVat)} />
              </p>
            )}
            {listing.listingKind === "sell" && listing.freeToCollector && (
              <p className="mt-3 text-lg font-semibold text-emerald-800">
                Free — arrange collection with the seller
              </p>
            )}
            {isAuction && (
              <div className="mt-3 space-y-1 border-t border-zinc-100 pt-3">
                <p className="text-2xl font-semibold tracking-tight text-zinc-900">
                  {topBid
                    ? `Current bid £${(buyerGrossPenceFromSellerNetPence(topBid.amountPence, chargesVat) / 100).toFixed(2)}${vatLabelSuffix(chargesVat)}`
                    : `Starting bid £${(buyerListPricePence / 100).toFixed(2)}${vatLabelSuffix(chargesVat)}`}
                </p>
                {listing.auctionEndsAt && (
                  <p className="text-sm text-zinc-600">
                    {auctionEnded ? "Auction ended" : `Ends ${listing.auctionEndsAt.toLocaleString()}`}
                  </p>
                )}
                {auctionLive && listing.auctionReservePence != null && (
                  <p className="text-xs font-medium text-amber-900">
                    Reserve applies — the item will not sell unless bidding reaches the seller’s minimum.
                  </p>
                )}
              </div>
            )}
            <p className="mt-3 text-sm text-zinc-500">
              {listing.category.name} · {CONDITION_LABELS[listing.condition]}
            </p>
            {(listing.postcode || listing.adminDistrict || listing.region) && (
              <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-zinc-600">
                <span className="font-medium text-zinc-800">Location</span>
                <span className="mt-1 block">
                  {[listing.adminDistrict, listing.region].filter(Boolean).join(" · ")}
                  {listing.postcode
                    ? `${listing.adminDistrict || listing.region ? " · " : ""}${listing.postcode}`
                    : ""}
                </span>
              </p>
            )}
          </section>

          <section className={sectionClass}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Collection &amp; delivery
            </h2>
            {listing.listingKind === "sell" && listing.freeToCollector ? (
              <p className="mt-3 text-sm text-zinc-700">
                Collection only — this item is free; arrange pickup with the seller.
              </p>
            ) : listing.offersDelivery ? (
              <div className="mt-3 space-y-3 text-sm text-zinc-700">
                <p>
                  Buyers can <strong>collect</strong> from the location above, or the seller may{" "}
                  <strong>arrange delivery</strong> as described below.
                </p>
                {structuredDelivery ? (
                  <ul className="space-y-1.5 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-zinc-800">
                    {structuredDelivery.map((o, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-zinc-400">·</span>
                        <span>{formatDeliveryOptionLine(o)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    {listing.deliveryNotes ? (
                      <p className="whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-zinc-800">
                        {listing.deliveryNotes}
                      </p>
                    ) : null}
                    <p className="text-zinc-600">
                      {listing.deliveryCostPence != null ? (
                        <>
                          Indicative delivery from{" "}
                          <strong>£{(listing.deliveryCostPence / 100).toFixed(2)}</strong> — confirm with
                          the seller after purchase.
                        </>
                      ) : (
                        <>
                          Delivery: <strong>quote on request</strong> — agree cost and timing with the
                          seller.
                        </>
                      )}
                    </p>
                  </>
                )}
                {listing.deliveryNotes && structuredDelivery ? (
                  <p className="whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-zinc-800">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      More detail
                    </span>
                    <br />
                    {listing.deliveryNotes}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-700">
                <strong>Collection only</strong> — arrange pickup with the seller from the item location.
              </p>
            )}
          </section>
          {isOwner &&
          listing.status === "active" &&
          listing.listingKind === "sell" &&
          !listing.freeToCollector &&
          !listing.propRentalOffer ? (
            <section className={sectionClass}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">The Prop Yard</h2>
              <p className="mt-2 text-sm text-zinc-700">
                Offer this listing for weekly film/TV hire from the same photos and description — no duplicate item
                needed.
              </p>
              <Link
                href={`/dashboard/prop-yard/wizard?listingId=${encodeURIComponent(listing.id)}`}
                className="mt-3 inline-block rounded-lg bg-amber-900 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-950"
              >
                Send to Prop Yard
              </Link>
            </section>
          ) : null}

          {listing.propRentalOffer?.isActive ? (
            <section className={sectionClass}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Also in The Prop Yard</h2>
              <p className="mt-2 text-sm text-zinc-700">
                This item can be hired as a prop at £
                {(listing.propRentalOffer.weeklyHirePence / 100).toFixed(2)}/week.
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Minimum {listing.propRentalOffer.minimumHireWeeks} week
                {listing.propRentalOffer.minimumHireWeeks === 1 ? "" : "s"}
                {isOwner ? (
                  <>
                    {" "}
                    · {listing.propRentalOffer.bookings.length} active request
                    {listing.propRentalOffer.bookings.length === 1 ? "" : "s"} ·{" "}
                    {listing.propRentalOffer.unavailability.length} blackout period
                    {listing.propRentalOffer.unavailability.length === 1 ? "" : "s"}.
                  </>
                ) : (
                  "."
                )}
              </p>
              <Link
                href={`/prop-yard/offers/${listing.propRentalOffer.id}`}
                className="mt-3 inline-block text-sm font-medium text-amber-900 hover:underline"
              >
                Open Prop Yard hire page →
              </Link>
            </section>
          ) : null}

          {!isOwner && session?.user?.id && (
            <section className={`${sectionClass} space-y-4`}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Buy or bid</h2>
              <div className="space-y-4">
            {listing.status === "active" && listing.listingKind === "sell" && (
              <>
                <ListingCheckoutActions
                  listingId={listing.id}
                  freeToCollector={listing.freeToCollector}
                  pricingMode={listing.pricingMode}
                  unitsAvailable={listing.unitsAvailable}
                  unitPricePence={buyerListPricePence}
                  offerId={acceptedMine?.id}
                  offerPayPenceGbp={
                    acceptedMine
                      ? buyerGrossPenceFromSellerNetPence(acceptedMine.offeredPrice, chargesVat)
                      : undefined
                  }
                  offerVatSuffix={acceptedMine ? vatLabelSuffix(chargesVat) : undefined}
                />
                {!listing.freeToCollector ? (
                  <HaggleForm
                    listingId={listing.id}
                    listPricePence={buyerListPricePence}
                    chargesVat={chargesVat}
                  />
                ) : null}
              </>
            )}

            {listing.status === "active" && isAuction && auctionLive && (
              <BidForm
                listingId={listing.id}
                minimumPounds={minNextPounds}
                hasBidPaymentMethod={!!buyerBidPay?.bidPaymentMethodId}
              />
            )}

            {isAuction && userWonAuction && topBid && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4">
                <p className="text-sm font-semibold text-amber-950">You won this auction</p>
                <p className="mt-1 text-xs text-amber-900/90">
                  We tried to charge your saved card automatically. If that didn’t go through, complete
                  payment here — same amount, secure Stripe checkout.
                </p>
                <div className="mt-3">
                  <AuctionWinCheckoutButton
                    listingId={listing.id}
                    bidId={topBid.id}
                    penceGbp={buyerGrossPenceFromSellerNetPence(topBid.amountPence, chargesVat)}
                    vatNote={chargesVat ? " (incl. VAT)" : ""}
                  />
                </div>
              </div>
            )}

            {listing.status === "active" && isAuction && auctionEnded && !userWonAuction && (
              <p className="text-sm text-zinc-600">This auction has ended.</p>
            )}
              </div>
            </section>
          )}

        {isOwner && listing.listingKind === "auction" && listing.status === "ended" && (
          <section className={`${sectionClass} text-sm text-zinc-700`}>
            <p className="font-semibold text-zinc-900">Auction ended</p>
            <p className="mt-1">
              {!topBid
                ? "There were no bids on this listing."
                : listing.auctionReservePence != null &&
                    topBid.amountPence < listing.auctionReservePence
                  ? "The highest bid was below your reserve — there was no sale."
                  : "There was no sale. Check your dashboard for next steps."}
            </p>
          </section>
        )}

        {isOwner && listing.status === "payment_pending" && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5 text-sm text-amber-950 shadow-sm sm:p-6">
            <p className="font-semibold">Awaiting payment</p>
            <p className="mt-1 text-amber-900/90">
              The winning bidder is completing payment (we tried their saved card first). You’ll see the
              sale in your dashboard when it succeeds.
            </p>
          </section>
        )}

        {!isOwner && !session?.user?.id && (
          <section className={sectionClass}>
            <p className="text-sm text-zinc-600">
              <Link href="/auth/signin" className="font-medium text-brand hover:underline">
                Sign in
              </Link>{" "}
              to buy, bid, or make an offer.
            </p>
          </section>
        )}

        {isOwner &&
          listing.status === "active" &&
          listing.listingKind === "sell" &&
          !listing.freeToCollector && (
            <ListingLocalYardsForOwner listingId={id} notifyLocalYards={listing.notifyLocalYards} />
          )}

        {isOwner && incomingOffers.length > 0 && (
          <section className="rounded-2xl border border-brand/25 bg-brand-soft/50 p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold text-zinc-900">Offers on this listing</h2>
            <ul className="mt-3 space-y-3">
              {incomingOffers.map((o) => (
                <li key={o.id} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
                  <p className="font-medium text-zinc-900">
                    £
                    {(buyerGrossPenceFromSellerNetPence(o.offeredPrice, chargesVat) / 100).toFixed(2)}
                    {vatLabelSuffix(chargesVat)} from {o.buyer.name ?? o.buyer.email ?? "Buyer"}
                  </p>
                  {o.message && <p className="mt-1 text-zinc-600">{o.message}</p>}
                  <OfferRespond
                    offerId={o.id}
                    listingActive={
                      listing.status === "active" &&
                      listing.listingKind === "sell" &&
                      !listing.freeToCollector
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {myOffers.length > 0 && (
          <section className={sectionClass}>
            <p className="font-medium text-zinc-800">Your recent offers</p>
            <ul className="mt-2 space-y-3">
              {myOffers.map((o) => (
                <li key={o.id} className="rounded-lg border border-zinc-100 bg-white/60 px-2 py-2">
                  <p className="text-sm text-zinc-700">
                    {o.fromSellerCounter ? (
                      <>
                        <span className="font-medium text-zinc-900">Seller counter-offer:</span> £
                        {(buyerGrossPenceFromSellerNetPence(o.offeredPrice, chargesVat) / 100).toFixed(2)}
                        {vatLabelSuffix(chargesVat)}
                      </>
                    ) : (
                      <>
                        Your offer: £
                        {(buyerGrossPenceFromSellerNetPence(o.offeredPrice, chargesVat) / 100).toFixed(2)}
                        {vatLabelSuffix(chargesVat)}
                      </>
                    )}{" "}
                    —{" "}
                    {o.status === "superseded" && !o.fromSellerCounter
                      ? "superseded (seller countered)"
                      : o.status}
                  </p>
                  {o.status === "pending" && o.fromSellerCounter ? (
                    <BuyerCounterRespond offerId={o.id} />
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        )}

        {isAuction && recentBids.length > 0 && (
          <section className="rounded-2xl border border-zinc-200/90 bg-zinc-50/90 p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold text-zinc-900">Recent bids</h2>
            <ul className="mt-2 space-y-1 text-sm text-zinc-600">
              {recentBids.map((b) => (
                <li key={b.id}>
                  <DisplayPrice
                    penceGbp={buyerGrossPenceFromSellerNetPence(b.amountPence, chargesVat)}
                    suffix={`${vatLabelSuffix(chargesVat)} · ${b.bidder.name ?? b.bidder.email ?? "Bidder"}`}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {sellerProfile && (
          <section className={sectionClass}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Seller</h2>
            {sellerBadges.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {sellerBadges.map((b) => (
                  <Link
                    key={b.key + b.label}
                    href={b.href}
                    title={b.title}
                    className="inline-flex items-center rounded-full border border-emerald-200/90 bg-gradient-to-r from-emerald-50 to-teal-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 shadow-sm ring-1 ring-emerald-100/80 transition hover:border-emerald-300 hover:from-emerald-100/80 hover:to-teal-100/80"
                  >
                    {b.label}
                  </Link>
                ))}
              </div>
            ) : null}
            <Link
              href={sellerPublicHref}
              className="mt-3 block text-base font-medium text-brand hover:underline"
            >
              {sellerProfile.displayName}
              {sellerProfile.businessName && ` · ${sellerProfile.businessName}`}
            </Link>
            <p className="mt-2 text-sm text-zinc-500">
              {[sellerProfile.adminDistrict, sellerProfile.region].filter(Boolean).join(" · ")}
              {sellerProfile.postcode
                ? `${sellerProfile.adminDistrict || sellerProfile.region ? " · " : ""}${sellerProfile.postcode}`
                : ""}
              {sellerHoursLine ? ` · ${sellerHoursLine}` : ""}
            </p>
            {listing.seller?.role === "reclamation_yard" &&
            (sellerProfile.openingHoursSchedule != null || sellerProfile.openingHours) ? (
              <p className="mt-2 text-xs">
                <Link
                  href={`${sellerPublicHref}#opening-hours`}
                  className="font-medium text-brand hover:underline"
                >
                  Full opening hours
                </Link>
              </p>
            ) : null}
          </section>
        )}
        </aside>
      </div>
    </div>
  );
}
