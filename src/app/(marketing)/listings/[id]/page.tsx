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
import { minimumNextBidPence } from "@/lib/auction";
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

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      category: true,
      seller: { include: { sellerProfile: true } },
    },
  });
  if (!listing || listing.status !== "active") notFound();

  const isOwner = session?.user?.id === listing.sellerId;
  const sellerProfile = listing.seller?.sellerProfile;

  const [topBid, recentBids, incomingOffers, myOffers, acceptedMine] = await Promise.all([
    prisma.bid.findFirst({
      where: { listingId: id },
      orderBy: { amountPence: "desc" },
      include: { bidder: { select: { name: true, email: true } } },
    }),
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
    auctionEnded &&
    topBid &&
    session?.user?.id === topBid.bidderId;

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
          </div>
        )}
        <p className="mt-1 text-sm text-zinc-500">
          {listing.category.name} · {CONDITION_LABELS[listing.condition]}
        </p>
        <p className="mt-4 whitespace-pre-wrap text-zinc-700">{listing.description}</p>

        {!isOwner && listing.status === "active" && session?.user?.id && (
          <div className="mt-6 space-y-4">
            {listing.listingKind === "sell" && listing.freeToCollector && (
              <FreeCollectButton listingId={listing.id} />
            )}

            {listing.listingKind === "sell" && !listing.freeToCollector && (
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

            {isAuction && auctionLive && <BidForm listingId={listing.id} minimumPounds={minNextPounds} />}

            {isAuction && auctionEnded && userWonAuction && topBid && (
              <BuyButton
                listingId={listing.id}
                bidId={topBid.id}
                label={`Pay winning bid £${(topBid.amountPence / 100).toFixed(2)}`}
              />
            )}

            {isAuction && auctionEnded && !userWonAuction && session?.user?.id && (
              <p className="text-sm text-zinc-600">This auction has ended.</p>
            )}
          </div>
        )}

        {!isOwner && !session?.user?.id && (
          <p className="mt-6 text-sm text-zinc-600">
            <Link href="/auth/signin" className="font-medium text-amber-700 hover:underline">
              Sign in
            </Link>{" "}
            to buy, bid, or make an offer.
          </p>
        )}

        {isOwner && incomingOffers.length > 0 && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
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
              className="mt-1 block text-amber-600 hover:underline"
            >
              {sellerProfile.displayName}
              {sellerProfile.businessName && ` · ${sellerProfile.businessName}`}
            </Link>
            <p className="mt-1 text-sm text-zinc-500">
              {sellerProfile.postcode}
              {sellerProfile.openingHours && ` · ${sellerProfile.openingHours}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
