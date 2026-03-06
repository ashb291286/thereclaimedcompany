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

  const sellerProfile = listing.seller?.sellerProfile;
  const stripeAccountId = sellerProfile?.stripeAccountId;
  if (!stripeAccountId) {
    return NextResponse.json(
      { error: "Seller has not set up payments yet" },
      { status: 400 }
    );
  }

  const amount = listing.price; // pence
  const applicationFeeAmount = Math.round(
    (amount * PLATFORM_FEE_PERCENT) / 100 + PLATFORM_FEE_FIXED
  );

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

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
