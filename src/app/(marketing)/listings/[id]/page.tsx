import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { BuyButton } from "./BuyButton";
import { FreeCollectButton } from "./FreeCollectButton";
import { HaggleForm } from "./HaggleForm";
import { BidForm } from "./BidForm";
import { OfferRespond } from "./OfferRespond";
import { CONDITION_LABELS, LISTING_KIND_LABELS } from "@/lib/constants";
import {
  formatDeliveryOptionLine,
  type DeliveryOptionStored,
} from "@/lib/delivery-carriers";
import { minimumNextBidPence } from "@/lib/auction";
import { finalizeAuctionListing } from "@/lib/auction-settlement";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id, status: "active" },
    select: { title: true, description: true, price: true },
  });
  if (!listing) return { title: "Listing" };
  return {
    title: listing.title,
    description: listing.description.slice(0, 160),
    openGraph: {
      title: listing.title,
      description: listing.description.slice(0, 160),
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
    },
  });
  if (!listing) notFound();

  const isOwner = session?.user?.id === listing.sellerId;

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

  const buyerBidPay =
    session?.user?.id && !isOwner
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { bidPaymentMethodId: true },
        })
      : null;

  const [recentBids, incomingOffers, myOffers, acceptedMine] = await Promise.all([
    prisma.bid.findMany({
      where: { listingId: id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { bidder: { select: { name: true, email: true } } },
    }),
    isOwner
      ? prisma.offer.findMany({
          where: { listingId: id, status: "pending" },
          include: { buyer: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    session?.user?.id && !isOwner
      ? prisma.offer.findMany({
          where: { listingId: id, buyerId: session.user.id },
          orderBy: { createdAt: "desc" },
          take: 5,
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
  ]);

  const now = new Date();
  const isAuction = listing.listingKind === "auction";
  const auctionEnded = Boolean(listing.auctionEndsAt && listing.auctionEndsAt <= now);
  const auctionLive = isAuction && !auctionEnded;
  const minNextPence = isAuction
    ? minimumNextBidPence(listing.price, topBid?.amountPence ?? null)
    : listing.price;
  const minNextPounds = minNextPence / 100;

  const userWonAuction =
    !!topBid &&
    session?.user?.id === topBid.bidderId &&
    listing.status === "payment_pending";

  const structuredDelivery: DeliveryOptionStored[] | null =
    Array.isArray(listing.deliveryOptions) && listing.deliveryOptions.length > 0
      ? (listing.deliveryOptions as DeliveryOptionStored[])
      : null;

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="flex-1">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-200">
          {listing.images[0] ? (
            <Image
              src={listing.images[0]}
              alt={listing.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-500">
              No image
            </div>
          )}
        </div>
        {listing.images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {listing.images.slice(1, 5).map((url) => (
              <div
                key={url}
                className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-200"
              >
                <Image src={url} alt="" fill className="object-cover" unoptimized />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="lg:w-96">
        <div className="flex flex-wrap gap-2">
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
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{listing.title}</h1>
        {listing.listingKind === "sell" && !listing.freeToCollector && (
          <p className="mt-2 text-2xl font-medium text-zinc-900">
            £{(listing.price / 100).toFixed(2)}
          </p>
        )}
        {listing.listingKind === "sell" && listing.freeToCollector && (
          <p className="mt-2 text-lg font-semibold text-emerald-800">Free — arrange collection with the seller</p>
        )}
        {isAuction && (
          <div className="mt-2 space-y-1">
            <p className="text-2xl font-medium text-zinc-900">
              {topBid
                ? `Current bid £${(topBid.amountPence / 100).toFixed(2)}`
                : `Starting bid £${(listing.price / 100).toFixed(2)}`}
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
        <p className="mt-1 text-sm text-zinc-500">
          {listing.category.name} · {CONDITION_LABELS[listing.condition]}
        </p>
        {(listing.postcode || listing.adminDistrict || listing.region) && (
          <p className="mt-2 text-sm text-zinc-600">
            <span className="font-medium text-zinc-700">Item location</span>
            <br />
            {[listing.adminDistrict, listing.region].filter(Boolean).join(" · ")}
            {listing.postcode ? `${listing.adminDistrict || listing.region ? " · " : ""}${listing.postcode}` : ""}
          </p>
        )}
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
          <h3 className="text-sm font-semibold text-zinc-900">Collection &amp; delivery</h3>
          {listing.listingKind === "sell" && listing.freeToCollector ? (
            <p className="mt-1 text-sm text-zinc-700">Collection only — this item is free; arrange pickup with the seller.</p>
          ) : listing.offersDelivery ? (
            <div className="mt-1 space-y-2 text-sm text-zinc-700">
              <p>
                Buyers can <strong>collect</strong> from the location above, or the seller may{" "}
                <strong>arrange delivery</strong> as described below.
              </p>
              {structuredDelivery ? (
                <ul className="space-y-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-800">
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
                    <p className="whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-800">
                      {listing.deliveryNotes}
                    </p>
                  ) : null}
                  <p className="text-zinc-600">
                    {listing.deliveryCostPence != null ? (
                      <>
                        Indicative delivery from{" "}
                        <strong>£{(listing.deliveryCostPence / 100).toFixed(2)}</strong> — confirm with the
                        seller after purchase.
                      </>
                    ) : (
                      <>
                        Delivery: <strong>quote on request</strong> — agree cost and timing with the seller.
                      </>
                    )}
                  </p>
                </>
              )}
              {listing.deliveryNotes && structuredDelivery ? (
                <p className="whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-800">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    More detail
                  </span>
                  <br />
                  {listing.deliveryNotes}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-1 text-sm text-zinc-700">
              <strong>Collection only</strong> — arrange pickup with the seller from the item location.
            </p>
          )}
        </div>
        <p className="mt-4 whitespace-pre-wrap text-zinc-700">{listing.description}</p>

        {!isOwner && session?.user?.id && (
          <div className="mt-6 space-y-4">
            {listing.status === "active" && listing.listingKind === "sell" && listing.freeToCollector && (
              <FreeCollectButton listingId={listing.id} />
            )}

            {listing.status === "active" && listing.listingKind === "sell" && !listing.freeToCollector && (
              <>
                {acceptedMine ? (
                  <BuyButton
                    listingId={listing.id}
                    offerId={acceptedMine.id}
                    label={`Pay agreed £${(acceptedMine.offeredPrice / 100).toFixed(2)}`}
                  />
                ) : (
                  <BuyButton listingId={listing.id} label="Buy at listed price" />
                )}
                <HaggleForm listingId={listing.id} listPricePence={listing.price} />
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
                  <BuyButton
                    listingId={listing.id}
                    bidId={topBid.id}
                    label={`Pay winning bid £${(topBid.amountPence / 100).toFixed(2)}`}
                  />
                </div>
              </div>
            )}

            {listing.status === "active" && isAuction && auctionEnded && !userWonAuction && (
              <p className="text-sm text-zinc-600">This auction has ended.</p>
            )}
          </div>
        )}

        {isOwner && listing.listingKind === "auction" && listing.status === "ended" && (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            <p className="font-semibold text-zinc-900">Auction ended</p>
            <p className="mt-1">
              {!topBid
                ? "There were no bids on this listing."
                : listing.auctionReservePence != null &&
                    topBid.amountPence < listing.auctionReservePence
                  ? "The highest bid was below your reserve — there was no sale."
                  : "There was no sale. Check your dashboard for next steps."}
            </p>
          </div>
        )}

        {isOwner && listing.status === "payment_pending" && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
            <p className="font-semibold">Awaiting payment</p>
            <p className="mt-1 text-amber-900/90">
              The winning bidder is completing payment (we tried their saved card first). You’ll see the
              sale in your dashboard when it succeeds.
            </p>
          </div>
        )}

        {!isOwner && !session?.user?.id && (
          <p className="mt-6 text-sm text-zinc-600">
            <Link href="/auth/signin" className="font-medium text-brand hover:underline">
              Sign in
            </Link>{" "}
            to buy, bid, or make an offer.
          </p>
        )}

        {isOwner && incomingOffers.length > 0 && (
          <div className="mt-6 rounded-xl border border-brand/20 bg-brand-soft/80 p-4">
            <h2 className="text-sm font-semibold text-zinc-900">Offers on this listing</h2>
            <ul className="mt-3 space-y-3">
              {incomingOffers.map((o) => (
                <li key={o.id} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
                  <p className="font-medium text-zinc-900">
                    £{(o.offeredPrice / 100).toFixed(2)} from{" "}
                    {o.buyer.name ?? o.buyer.email ?? "Buyer"}
                  </p>
                  {o.message && <p className="mt-1 text-zinc-600">{o.message}</p>}
                  <OfferRespond offerId={o.id} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {myOffers.length > 0 && (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-600">
            <p className="font-medium text-zinc-800">Your recent offers</p>
            <ul className="mt-2 space-y-1">
              {myOffers.map((o) => (
                <li key={o.id}>
                  £{(o.offeredPrice / 100).toFixed(2)} — {o.status}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isAuction && recentBids.length > 0 && (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="text-sm font-semibold text-zinc-900">Recent bids</h2>
            <ul className="mt-2 space-y-1 text-sm text-zinc-600">
              {recentBids.map((b) => (
                <li key={b.id}>
                  £{(b.amountPence / 100).toFixed(2)} · {b.bidder.name ?? b.bidder.email ?? "Bidder"}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sellerProfile && (
          <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="font-medium text-zinc-900">Seller</h2>
            <Link
              href={`/sellers/${listing.sellerId}`}
              className="mt-1 block text-brand hover:underline"
            >
              {sellerProfile.displayName}
              {sellerProfile.businessName && ` · ${sellerProfile.businessName}`}
            </Link>
            <p className="mt-1 text-sm text-zinc-500">
              {[sellerProfile.adminDistrict, sellerProfile.region].filter(Boolean).join(" · ")}
              {sellerProfile.postcode
                ? `${sellerProfile.adminDistrict || sellerProfile.region ? " · " : ""}${sellerProfile.postcode}`
                : ""}
              {sellerProfile.openingHours && ` · ${sellerProfile.openingHours}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
