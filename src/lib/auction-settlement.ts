import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { createNotification } from "@/lib/notifications";
import { purchaseCarbonSnapshotFromListing } from "@/lib/order-carbon";
import { ListingStatus } from "@/generated/prisma/client";
import { buyerGrossPenceFromSellerNetPence, sellerChargesVat } from "@/lib/vat-pricing";

const PLATFORM_FEE_PERCENT = 10;
const PLATFORM_FEE_FIXED = 20; // pence

function platformFeePence(amountPence: number): number {
  return Math.round((amountPence * PLATFORM_FEE_PERCENT) / 100 + PLATFORM_FEE_FIXED);
}

/**
 * Run when an auction listing has passed auctionEndsAt while still active.
 * Sets reserve outcome, attempts off-session charge for the winner, or payment_pending.
 */
export async function finalizeAuctionListing(listingId: string): Promise<void> {
  const now = new Date();

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { seller: { include: { sellerProfile: true } } },
  });

  if (!listing || listing.listingKind !== "auction") return;
  if (listing.status !== ListingStatus.active) return;
  if (!listing.auctionEndsAt || listing.auctionEndsAt > now) return;
  if (listing.auctionFinalizedAt) return;

  const top = await prisma.bid.findFirst({
    where: { listingId },
    orderBy: { amountPence: "desc" },
  });

  if (!top) {
    await prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.ended, auctionFinalizedAt: now },
    });
    await createNotification({
      userId: listing.sellerId,
      type: "auction_ended_no_bids",
      title: "Auction ended with no bids",
      body: `“${listing.title}” received no bids.`,
      linkUrl: `/dashboard/listings/${listingId}/edit`,
    });
    return;
  }

  const reserve = listing.auctionReservePence;
  if (reserve != null && top.amountPence < reserve) {
    await prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.ended, auctionFinalizedAt: now },
    });
    await createNotification({
      userId: listing.sellerId,
      type: "auction_reserve_not_met",
      title: "Reserve not met",
      body: `The auction for “${listing.title}” ended below your reserve.`,
      linkUrl: `/dashboard`,
    });
    await createNotification({
      userId: top.bidderId,
      type: "auction_reserve_not_met_bidder",
      title: "Auction ended — reserve not met",
      body: `Your high bid on “${listing.title}” did not meet the seller’s reserve.`,
      linkUrl: `/listings/${listingId}`,
    });
    return;
  }

  const existingOrder = await prisma.order.findUnique({ where: { bidId: top.id } });
  if (existingOrder) {
    await prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.sold, auctionFinalizedAt: now },
    });
    return;
  }

  const buyer = await prisma.user.findUnique({ where: { id: top.bidderId } });
  const destination = listing.seller.sellerProfile?.stripeAccountId;
  const winChargesVat = sellerChargesVat({
    sellerRole: listing.seller.role,
    vatRegistered: listing.seller.sellerProfile?.vatRegistered,
  });
  const amount = buyerGrossPenceFromSellerNetPence(top.amountPence, winChargesVat);
  const applicationFeeAmount = platformFeePence(amount);

  if (!buyer?.stripeCustomerId || !buyer?.bidPaymentMethodId || !destination) {
    await prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.payment_pending, auctionFinalizedAt: now },
    });
    await createNotification({
      userId: top.bidderId,
      type: "auction_pay_manually",
      title: "Complete payment for your win",
      body: `You won “${listing.title}”. Pay with your card to complete the purchase.`,
      linkUrl: `/listings/${listingId}`,
    });
    return;
  }

  try {
    const pi = await stripe.paymentIntents.create(
      {
        amount,
        currency: "gbp",
        customer: buyer.stripeCustomerId,
        payment_method: buyer.bidPaymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          listingId,
          buyerId: top.bidderId,
          sellerId: listing.sellerId,
          bidId: top.id,
          amount: String(amount),
          platformFee: String(applicationFeeAmount),
          kind: "auction_win",
        },
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination },
      },
      { idempotencyKey: `auction_win_${listingId}` }
    );

    if (pi.status === "succeeded") {
      await prisma.$transaction(async (tx) => {
        const dup = await tx.order.findUnique({ where: { bidId: top.id } });
        if (dup) {
          await tx.listing.update({
            where: { id: listingId },
            data: { status: ListingStatus.sold, auctionFinalizedAt: now },
          });
          return;
        }
        await tx.order.create({
          data: {
            listingId,
            buyerId: top.bidderId,
            sellerId: listing.sellerId,
            amount,
            platformFee: applicationFeeAmount,
            stripePaymentIntentId: pi.id,
            status: "paid",
            bidId: top.id,
            quantity: 1,
            ...purchaseCarbonSnapshotFromListing(listing),
          },
        });
        await tx.listing.update({
          where: { id: listingId },
          data: { status: ListingStatus.sold, auctionFinalizedAt: now },
        });
      });

      await createNotification({
        userId: top.bidderId,
        type: "auction_won",
        title: "You won the auction",
        body: `Payment was taken for “${listing.title}”.`,
        linkUrl: `/orders`,
      });
      await createNotification({
        userId: listing.sellerId,
        type: "auction_sold",
        title: "Your auction sold",
        body: `“${listing.title}” sold for £${(amount / 100).toFixed(2)}.`,
        linkUrl: `/dashboard`,
      });
      return;
    }

    await prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.payment_pending, auctionFinalizedAt: now },
    });
    await createNotification({
      userId: top.bidderId,
      type: "auction_pay_manually",
      title: "Payment needs completing",
      body: `We couldn’t charge your saved card for “${listing.title}”. Pay on the listing page.`,
      linkUrl: `/listings/${listingId}`,
    });
  } catch {
    await prisma.listing.update({
      where: { id: listingId },
      data: { status: ListingStatus.payment_pending, auctionFinalizedAt: now },
    });
    await createNotification({
      userId: top.bidderId,
      type: "auction_pay_manually",
      title: "Payment needs completing",
      body: `We couldn’t charge your saved card for “${listing.title}”. Pay on the listing page.`,
      linkUrl: `/listings/${listingId}`,
    });
  }
}
