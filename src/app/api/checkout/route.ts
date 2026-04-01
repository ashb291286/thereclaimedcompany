import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

const PLATFORM_FEE_PERCENT = 10;
const PLATFORM_FEE_FIXED = 20; // pence

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to purchase" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const listingId = body.listingId as string | undefined;
  const offerId = body.offerId as string | undefined;
  const bidId = body.bidId as string | undefined;

  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId, status: "active" },
    include: {
      seller: { include: { sellerProfile: true } },
    },
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found or not available" }, { status: 404 });
  }
  if (listing.sellerId === session.user.id) {
    return NextResponse.json({ error: "Cannot buy your own listing" }, { status: 400 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  // Free to collector — no Stripe
  if (listing.listingKind === "sell" && listing.freeToCollector && listing.price === 0) {
    await prisma.$transaction([
      prisma.order.create({
        data: {
          listingId,
          buyerId: session.user.id,
          sellerId: listing.sellerId,
          amount: 0,
          platformFee: 0,
          status: "paid",
        },
      }),
      prisma.listing.update({
        where: { id: listingId },
        data: { status: "sold" },
      }),
    ]);
    return NextResponse.json({ url: `${baseUrl}/orders?collected=1` });
  }

  const sellerProfile = listing.seller?.sellerProfile;
  const stripeAccountId = sellerProfile?.stripeAccountId;
  if (!stripeAccountId) {
    return NextResponse.json(
      { error: "Seller has not set up payments yet" },
      { status: 400 }
    );
  }

  let amount = listing.price;
  let metadataOfferId = "";
  let metadataBidId = "";

  if (listing.listingKind === "auction") {
    const ended = listing.auctionEndsAt && new Date() > listing.auctionEndsAt;
    if (!ended) {
      return NextResponse.json(
        { error: "This auction is still open — place a bid instead." },
        { status: 400 }
      );
    }
    if (!bidId) {
      return NextResponse.json(
        { error: "Use the Pay winning bid button if you won the auction." },
        { status: 400 }
      );
    }
    const bid = await prisma.bid.findFirst({
      where: { id: bidId, listingId, bidderId: session.user.id },
    });
    if (!bid) {
      return NextResponse.json({ error: "Invalid bid" }, { status: 400 });
    }
    const top = await prisma.bid.findFirst({
      where: { listingId },
      orderBy: { amountPence: "desc" },
    });
    if (!top || top.id !== bid.id) {
      return NextResponse.json({ error: "Only the winning bidder can pay" }, { status: 400 });
    }
    amount = bid.amountPence;
    metadataBidId = bid.id;
  } else if (offerId) {
    const offer = await prisma.offer.findFirst({
      where: {
        id: offerId,
        listingId,
        buyerId: session.user.id,
        status: "accepted",
      },
    });
    if (!offer) {
      return NextResponse.json({ error: "No accepted offer found for you on this listing" }, { status: 400 });
    }
    amount = offer.offeredPrice;
    metadataOfferId = offer.id;
  }

  if (amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const applicationFeeAmount = Math.round(
    (amount * PLATFORM_FEE_PERCENT) / 100 + PLATFORM_FEE_FIXED
  );

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: stripeAccountId,
        },
      },
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: amount,
            product_data: {
              name: listing.title,
              description: listing.description.slice(0, 500),
              images: listing.images.length ? [listing.images[0]] : undefined,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/orders?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/listings/${listingId}`,
      client_reference_id: listingId,
      metadata: {
        listingId,
        buyerId: session.user.id,
        sellerId: listing.sellerId,
        amount: String(amount),
        platformFee: String(applicationFeeAmount),
        ...(metadataOfferId ? { offerId: metadataOfferId } : {}),
        ...(metadataBidId ? { bidId: metadataBidId } : {}),
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    console.error("Checkout error:", e);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
