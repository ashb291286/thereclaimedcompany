import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { STRIPE_MIN_AMOUNT_PENCE } from "@/lib/constants";

const PLATFORM_FEE_PERCENT = 10;
const PLATFORM_FEE_FIXED = 20; // pence

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const batchId = typeof body.batchId === "string" ? body.batchId.trim() : "";
  const sellerId = typeof body.sellerId === "string" ? body.sellerId.trim() : "";
  if (!batchId || !sellerId) {
    return NextResponse.json({ error: "batchId and sellerId required" }, { status: 400 });
  }

  const bookings = await prisma.propRentalBooking.findMany({
    where: {
      hireRequestBatchId: batchId,
      hirerId: session.user.id,
      hirePaidAt: null,
      status: "REQUESTED",
      offer: { listing: { sellerId } },
    },
    include: {
      offer: {
        include: {
          listing: {
            include: {
              seller: { include: { sellerProfile: true } },
            },
          },
        },
      },
    },
  });

  if (bookings.length === 0) {
    return NextResponse.json(
      { error: "Nothing to pay for this yard — it may already be paid or the batch is invalid." },
      { status: 400 }
    );
  }

  const stripeAccountId = bookings[0].offer.listing.seller.sellerProfile?.stripeAccountId;
  if (!stripeAccountId) {
    return NextResponse.json(
      { error: "This yard has not finished Stripe setup yet — we’ll notify you when you can pay here." },
      { status: 400 }
    );
  }

  let amount = 0;
  for (const b of bookings) {
    amount += b.totalHirePence;
  }

  if (amount < STRIPE_MIN_AMOUNT_PENCE) {
    return NextResponse.json(
      { error: `Total must be at least £${(STRIPE_MIN_AMOUNT_PENCE / 100).toFixed(2)}` },
      { status: 400 }
    );
  }

  const applicationFeeAmount = Math.round((amount * PLATFORM_FEE_PERCENT) / 100 + PLATFORM_FEE_FIXED);
  const bookingIds = bookings.map((b) => b.id).join(",");

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: stripeAccountId },
      },
      line_items: bookings.map((b) => ({
        price_data: {
          currency: "gbp",
          unit_amount: b.totalHirePence,
          product_data: {
            name: `Prop hire: ${b.offer.listing.title}`,
            description: `Hire ${b.hireStart.toLocaleDateString("en-GB")} → ${b.hireEnd.toLocaleDateString("en-GB")} · The Prop Yard`,
            images: b.offer.listing.images[0] ? [b.offer.listing.images[0]] : undefined,
          },
        },
        quantity: 1,
      })),
      success_url: `${baseUrl}/prop-yard/hires/success?batchId=${encodeURIComponent(batchId)}&paid=1`,
      cancel_url: `${baseUrl}/prop-yard/hires/success?batchId=${encodeURIComponent(batchId)}&cancelled=1`,
      client_reference_id: batchId,
      metadata: {
        kind: "prop_hire_batch",
        batchId,
        hirerId: session.user.id,
        sellerId,
        bookingIds,
        amount: String(amount),
        platformFee: String(applicationFeeAmount),
      },
    });

    if (checkoutSession.id) {
      await prisma.propRentalBooking.updateMany({
        where: { id: { in: bookings.map((b) => b.id) } },
        data: { stripeCheckoutSessionId: checkoutSession.id },
      });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    console.error("Prop hire checkout error:", e);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
