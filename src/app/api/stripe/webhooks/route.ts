import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { purchaseCarbonSnapshotFromListing } from "@/lib/order-carbon";
import { NextResponse } from "next/server";
import type { Stripe } from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const listingId = session.metadata?.listingId;
    const buyerId = session.metadata?.buyerId;
    const sellerId = session.metadata?.sellerId;
    const amount = parseInt(session.metadata?.amount ?? "0", 10);
    const platformFee = parseInt(session.metadata?.platformFee ?? "0", 10);
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
    const offerIdMeta = session.metadata?.offerId?.trim();
    const bidIdMeta = session.metadata?.bidId?.trim();

    if (listingId && buyerId && sellerId && paymentIntentId) {
      const existingBidOrder = bidIdMeta
        ? await prisma.order.findUnique({ where: { bidId: bidIdMeta } })
        : null;
      if (!existingBidOrder) {
        const listingRow = await prisma.listing.findUnique({
          where: { id: listingId },
          select: { carbonSavedKg: true, carbonWasteDivertedKg: true },
        });
        const carbonSnap = purchaseCarbonSnapshotFromListing(
          listingRow ?? { carbonSavedKg: null, carbonWasteDivertedKg: null }
        );
        await prisma.$transaction([
          prisma.order.create({
            data: {
              listingId,
              buyerId,
              sellerId,
              amount,
              platformFee,
              stripePaymentIntentId: paymentIntentId,
              status: "paid",
              ...carbonSnap,
              ...(offerIdMeta ? { offerId: offerIdMeta } : {}),
              ...(bidIdMeta ? { bidId: bidIdMeta } : {}),
            },
          }),
          prisma.listing.update({
            where: { id: listingId },
            data: { status: "sold" },
          }),
        ]);
      }
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    if (pi.metadata?.kind === "auction_win") {
      const listingId = pi.metadata.listingId;
      const buyerId = pi.metadata.buyerId;
      const sellerId = pi.metadata.sellerId;
      const bidIdMeta = pi.metadata.bidId?.trim();
      const amount = parseInt(pi.metadata.amount ?? "0", 10);
      const platformFee = parseInt(pi.metadata.platformFee ?? "0", 10);
      if (listingId && buyerId && sellerId && bidIdMeta && pi.id) {
        const existing = await prisma.order.findUnique({ where: { bidId: bidIdMeta } });
        if (!existing) {
          const listingRow = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { carbonSavedKg: true, carbonWasteDivertedKg: true },
          });
          const carbonSnap = purchaseCarbonSnapshotFromListing(
            listingRow ?? { carbonSavedKg: null, carbonWasteDivertedKg: null }
          );
          await prisma.$transaction([
            prisma.order.create({
              data: {
                listingId,
                buyerId,
                sellerId,
                amount,
                platformFee,
                stripePaymentIntentId: pi.id,
                status: "paid",
                bidId: bidIdMeta,
                ...carbonSnap,
              },
            }),
            prisma.listing.update({
              where: { id: listingId },
              data: { status: "sold" },
            }),
          ]);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
