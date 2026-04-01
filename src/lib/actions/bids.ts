"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { STRIPE_MIN_AMOUNT_PENCE } from "@/lib/constants";
import { minimumNextBidPence } from "@/lib/auction";

export async function placeBid(listingId: string, bidPounds: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in to bid." };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId, status: "active" },
  });
  if (!listing) return { ok: false as const, error: "Listing not available." };
  if (listing.listingKind !== "auction") {
    return { ok: false as const, error: "This listing is not an auction." };
  }
  if (!listing.auctionEndsAt || listing.auctionEndsAt <= new Date()) {
    return { ok: false as const, error: "This auction has ended." };
  }
  if (listing.sellerId === session.user.id) {
    return { ok: false as const, error: "You cannot bid on your own auction." };
  }

  const amountPence = Math.round(bidPounds * 100);
  if (Number.isNaN(amountPence) || amountPence < STRIPE_MIN_AMOUNT_PENCE) {
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

  if (amountPence < minimumNext) {
    return {
      ok: false as const,
      error: `Your bid must be at least £${(minimumNext / 100).toFixed(2)}.`,
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

  revalidatePath(`/listings/${listingId}`);
  return { ok: true as const };
}
