import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { purchaseCarbonSnapshotFromListing } from "@/lib/order-carbon";
import { NextResponse } from "next/server";
import type { Stripe } from "stripe";
import { createNotification } from "@/lib/notifications";
import { ListingPricingMode } from "@/generated/prisma/client";

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
    const kind = session.metadata?.kind;
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

    if (kind === "prop_hire_batch" && paymentIntentId) {
      const batchIdMeta = session.metadata?.batchId?.trim();
      const hirerIdMeta = session.metadata?.hirerId?.trim();
      const bookingIdsRaw = session.metadata?.bookingIds?.trim();
      if (batchIdMeta && hirerIdMeta && bookingIdsRaw) {
        const bookingIds = bookingIdsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (bookingIds.length > 0) {
          await prisma.propRentalBooking.updateMany({
            where: {
              id: { in: bookingIds },
              hirerId: hirerIdMeta,
              hireRequestBatchId: batchIdMeta,
              hirePaidAt: null,
            },
            data: {
              hirePaidAt: new Date(),
              stripeCheckoutSessionId: session.id,
            },
          });
        }
      }
      return NextResponse.json({ received: true });
    }

    if (kind === "listing_boost" && listingId && sellerId && paymentIntentId) {
      const listing = await prisma.listing.findFirst({
        where: { id: listingId, sellerId },
        select: {
          id: true,
          sellerId: true,
          title: true,
          adminDistrict: true,
          region: true,
          boostLastPaymentIntentId: true,
          boostedUntil: true,
        },
      });
      if (listing && listing.boostLastPaymentIntentId !== paymentIntentId) {
        const now = new Date();
        const base = listing.boostedUntil && listing.boostedUntil > now ? listing.boostedUntil : now;
        const boostedUntil = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
        await prisma.listing.update({
          where: { id: listing.id },
          data: {
            boostedUntil,
            boostLastPaymentIntentId: paymentIntentId,
            updatedAt: now,
          },
        });

        const localWhere: {
          OR?: Array<{ sellerProfile: { is: { adminDistrict?: string; region?: string } } }>;
          role: "reclamation_yard";
          id: { not: string };
          sellerProfile: { isNot: null };
        } = {
          role: "reclamation_yard",
          id: { not: listing.sellerId },
          sellerProfile: { isNot: null },
        };
        const or: Array<{ sellerProfile: { is: { adminDistrict?: string; region?: string } } }> = [];
        if (listing.adminDistrict) {
          or.push({ sellerProfile: { is: { adminDistrict: listing.adminDistrict } } });
        }
        if (listing.region) {
          or.push({ sellerProfile: { is: { region: listing.region } } });
        }
        if (or.length > 0) localWhere.OR = or;
        else return NextResponse.json({ received: true });

        const localYards = await prisma.user.findMany({
          where: localWhere,
          select: { id: true },
        });
        for (const yard of localYards) {
          await createNotification({
            userId: yard.id,
            type: "boosted_listing_local",
            title: "Local boosted listing available",
            body: `“${listing.title}” has been promoted locally and is available now.`,
            linkUrl: `/listings/${listing.id}`,
          });
        }
      }
      return NextResponse.json({ received: true });
    }

    if (listingId && buyerId && sellerId && paymentIntentId) {
      const existingBidOrder = bidIdMeta
        ? await prisma.order.findUnique({ where: { bidId: bidIdMeta } })
        : null;
      if (!existingBidOrder) {
        const qtyRaw = parseInt(session.metadata?.quantity ?? "1", 10);
        const orderQuantity =
          Number.isFinite(qtyRaw) && qtyRaw >= 1 ? Math.min(qtyRaw, 10_000) : 1;
        await prisma.$transaction(async (tx) => {
          const listingRow = await tx.listing.findUnique({
            where: { id: listingId },
            select: {
              carbonSavedKg: true,
              carbonWasteDivertedKg: true,
              pricingMode: true,
              unitsAvailable: true,
            },
          });
          const carbonSnap = purchaseCarbonSnapshotFromListing(
            listingRow ?? { carbonSavedKg: null, carbonWasteDivertedKg: null }
          );
          await tx.order.create({
            data: {
              listingId,
              buyerId,
              sellerId,
              amount,
              platformFee,
              stripePaymentIntentId: paymentIntentId,
              status: "paid",
              quantity: offerIdMeta || bidIdMeta ? 1 : orderQuantity,
              ...carbonSnap,
              ...(offerIdMeta ? { offerId: offerIdMeta } : {}),
              ...(bidIdMeta ? { bidId: bidIdMeta } : {}),
            },
          });
          const forStock = await tx.listing.findUnique({ where: { id: listingId } });
          if (
            forStock?.pricingMode === ListingPricingMode.PER_UNIT &&
            forStock.unitsAvailable != null &&
            !offerIdMeta &&
            !bidIdMeta
          ) {
            const rem = forStock.unitsAvailable - orderQuantity;
            await tx.listing.update({
              where: { id: listingId },
              data: {
                unitsAvailable: rem > 0 ? rem : null,
                status: rem <= 0 ? "sold" : "active",
              },
            });
          } else {
            await tx.listing.update({
              where: { id: listingId },
              data: { status: "sold" },
            });
          }
        });
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
                quantity: 1,
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
