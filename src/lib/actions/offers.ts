"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { STRIPE_MIN_AMOUNT_PENCE } from "@/lib/constants";

export async function submitOffer(listingId: string, offeredPricePounds: number, message?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in to make an offer." };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId, status: "active" },
    include: { seller: true },
  });
  if (!listing) return { ok: false as const, error: "Listing not available." };
  if (listing.sellerId === session.user.id) {
    return { ok: false as const, error: "You cannot offer on your own listing." };
  }
  if (listing.listingKind !== "sell" || listing.freeToCollector) {
    return { ok: false as const, error: "Offers are only available on paid fixed-price listings." };
  }

  const offeredPrice = Math.round(offeredPricePounds * 100);
  if (Number.isNaN(offeredPrice) || offeredPrice < STRIPE_MIN_AMOUNT_PENCE) {
    return {
      ok: false as const,
      error: `Offer must be at least £${(STRIPE_MIN_AMOUNT_PENCE / 100).toFixed(2)} (card minimum).`,
    };
  }

  const trimmed = message?.trim() || null;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.offer.updateMany({
      where: {
        listingId,
        buyerId: session.user.id,
        status: "pending",
      },
      data: { status: "withdrawn", respondedAt: now },
    });
    const created = await tx.offer.create({
      data: {
        listingId,
        buyerId: session.user.id,
        offeredPrice,
        message: trimmed,
        status: "pending",
      },
    });
    await tx.listingLocalYardAlert.updateMany({
      where: {
        listingId,
        yardUserId: session.user.id,
        status: "PENDING",
      },
      data: { linkedOfferId: created.id },
    });
  });

  await createNotification({
    userId: listing.sellerId,
    type: "offer_received",
    title: "New price offer",
    body: `${session.user.name ?? session.user.email ?? "A buyer"} offered £${(offeredPrice / 100).toFixed(2)} on “${listing.title}”.`,
    linkUrl: `/dashboard/offers`,
  });

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/dashboard/offers");
  revalidatePath("/dashboard/nearby-stock");
  return { ok: true as const };
}

export async function respondToOffer(offerId: string, action: "accept" | "decline") {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in required." };
  }

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { listing: true },
  });
  if (!offer || offer.listing.sellerId !== session.user.id) {
    return { ok: false as const, error: "Offer not found." };
  }
  if (offer.status !== "pending") {
    return { ok: false as const, error: "This offer is no longer pending." };
  }

  const now = new Date();

  if (action === "decline") {
    await prisma.offer.update({
      where: { id: offerId },
      data: { status: "declined", respondedAt: now },
    });
    await createNotification({
      userId: offer.buyerId,
      type: "offer_declined",
      title: "Offer declined",
      body: `Your offer on “${offer.listing.title}” was declined.`,
      linkUrl: `/listings/${offer.listingId}`,
    });
    revalidatePath(`/listings/${offer.listingId}`);
    revalidatePath("/dashboard/offers");
    revalidatePath("/dashboard/nearby-stock");
    return { ok: true as const };
  }

  await prisma.$transaction([
    prisma.offer.updateMany({
      where: {
        listingId: offer.listingId,
        status: "pending",
        id: { not: offerId },
      },
      data: { status: "declined", respondedAt: now },
    }),
    prisma.offer.update({
      where: { id: offerId },
      data: { status: "accepted", respondedAt: now },
    }),
  ]);

  await createNotification({
    userId: offer.buyerId,
    type: "offer_accepted",
    title: "Offer accepted — complete purchase",
    body: `The seller accepted your offer of £${(offer.offeredPrice / 100).toFixed(2)} for “${offer.listing.title}”. Pay from the listing page.`,
    linkUrl: `/listings/${offer.listingId}`,
  });

  revalidatePath(`/listings/${offer.listingId}`);
  revalidatePath("/dashboard/offers");
  revalidatePath("/dashboard/nearby-stock");
  return { ok: true as const };
}
