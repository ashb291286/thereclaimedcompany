"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { STRIPE_MIN_AMOUNT_PENCE } from "@/lib/constants";
import { minimumNextBidPence } from "@/lib/auction";
import {
  buyerGrossPenceFromSellerNetPence,
  sellerChargesVat,
  sellerNetPenceFromBuyerGrossPence,
} from "@/lib/vat-pricing";

export async function placeBid(listingId: string, bidPounds: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in to bid." };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId, status: "active" },
    include: {
      seller: { include: { sellerProfile: { select: { vatRegistered: true } } } },
    },
  });
  if (!listing) return { ok: false as const, error: "Listing not available." };
  if (!listing.visibleOnMarketplace) {
    return { ok: false as const, error: "This auction is not available." };
  }
  if (listing.listingKind !== "auction") {
    return { ok: false as const, error: "This listing is not an auction." };
  }
  if (!listing.auctionEndsAt || listing.auctionEndsAt <= new Date()) {
    return { ok: false as const, error: "This auction has ended." };
  }
  if (listing.sellerId === session.user.id) {
    return { ok: false as const, error: "You cannot bid on your own auction." };
  }

  const bidder = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { bidPaymentMethodId: true },
  });
  if (!bidder?.bidPaymentMethodId) {
    return {
      ok: false as const,
      error: "Save a card for bidding first — it will be charged automatically if you win.",
    };
  }

  const bidChargesVat = sellerChargesVat({
    sellerRole: listing.seller.role,
    vatRegistered: listing.seller.sellerProfile?.vatRegistered,
  });
  const inputBidPence = Math.round(bidPounds * 100);
  const amountPence = bidChargesVat ? sellerNetPenceFromBuyerGrossPence(inputBidPence) : inputBidPence;
  const minCardPence = bidChargesVat ? inputBidPence : amountPence;
  if (Number.isNaN(amountPence) || minCardPence < STRIPE_MIN_AMOUNT_PENCE) {
    return {
      ok: false as const,
      error: `Bid must be at least £${(STRIPE_MIN_AMOUNT_PENCE / 100).toFixed(2)}.`,
    };
  }

  const top = await prisma.bid.findFirst({
    where: { listingId },
    orderBy: { amountPence: "desc" },
  });

  const minimumNext = minimumNextBidPence(listing.price, top?.amountPence ?? null);
  const minimumDisplayPence = buyerGrossPenceFromSellerNetPence(minimumNext, bidChargesVat);

  if (amountPence < minimumNext) {
    return {
      ok: false as const,
      error: `Your bid must be at least £${(minimumDisplayPence / 100).toFixed(2)}${bidChargesVat ? " (incl. VAT)" : ""}.`,
    };
  }

  const previousLeaderId = top?.bidderId;

  await prisma.bid.create({
    data: {
      listingId,
      bidderId: session.user.id,
      amountPence,
    },
  });

  if (previousLeaderId && previousLeaderId !== session.user.id) {
    await createNotification({
      userId: previousLeaderId,
      type: "auction_outbid",
      title: "You’ve been outbid",
      body: `Someone placed a higher bid on “${listing.title}”.`,
      linkUrl: `/listings/${listingId}`,
    });
  }

  const bidDisplayPence = buyerGrossPenceFromSellerNetPence(amountPence, bidChargesVat);
  const bidDisplay = `£${(bidDisplayPence / 100).toFixed(2)}${bidChargesVat ? " (incl. VAT)" : ""}`;
  await createNotification({
    userId: listing.sellerId,
    type: "auction_new_bid",
    title: "New bid on your auction",
    body: `Someone bid ${bidDisplay} on “${listing.title}”.`,
    linkUrl: `/listings/${listingId}`,
  });

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/my-bids");
  return { ok: true as const };
}
