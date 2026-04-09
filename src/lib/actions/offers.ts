"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { STRIPE_MIN_AMOUNT_PENCE } from "@/lib/constants";
import {
  buyerGrossPenceFromSellerNetPence,
  sellerChargesVat,
  sellerNetPenceFromBuyerGrossPence,
} from "@/lib/vat-pricing";

export async function submitOffer(listingId: string, offeredPricePounds: number, message?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in to make an offer." };
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId, status: "active" },
    include: { seller: { include: { sellerProfile: { select: { vatRegistered: true } } } } },
  });
  if (!listing) return { ok: false as const, error: "Listing not available." };
  if (!listing.visibleOnMarketplace) {
    return { ok: false as const, error: "This item is not open to offers on the marketplace." };
  }
  if (listing.sellerId === session.user.id) {
    return { ok: false as const, error: "You cannot offer on your own listing." };
  }
  if (listing.listingKind !== "sell" || listing.freeToCollector) {
    return { ok: false as const, error: "Offers are only available on paid fixed-price listings." };
  }

  const inputPence = Math.round(offeredPricePounds * 100);
  const chargesVat = sellerChargesVat({
    sellerRole: listing.seller.role,
    vatRegistered: listing.seller.sellerProfile?.vatRegistered,
  });
  const offeredPrice = chargesVat ? sellerNetPenceFromBuyerGrossPence(inputPence) : inputPence;
  const buyerCheckoutPence = chargesVat ? inputPence : offeredPrice;
  if (Number.isNaN(offeredPrice) || buyerCheckoutPence < STRIPE_MIN_AMOUNT_PENCE) {
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

  const sellerLinePence = buyerGrossPenceFromSellerNetPence(offeredPrice, chargesVat);
  await createNotification({
    userId: listing.sellerId,
    type: "offer_received",
    title: "New price offer",
    body: `${session.user.name ?? session.user.email ?? "A buyer"} offered £${(sellerLinePence / 100).toFixed(2)}${chargesVat ? " (incl. VAT)" : ""} on “${listing.title}”.`,
    linkUrl: `/dashboard/offers`,
  });

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/dashboard");
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
    include: {
      listing: {
        include: {
          seller: { include: { sellerProfile: { select: { vatRegistered: true } } } },
        },
      },
    },
  });
  if (!offer || offer.listing.sellerId !== session.user.id) {
    return { ok: false as const, error: "Offer not found." };
  }
  if (offer.fromSellerCounter) {
    return {
      ok: false as const,
      error: "This is your counter-offer — the buyer accepts or declines it from their account.",
    };
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
    revalidatePath("/dashboard");
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

  const acceptChargesVat = sellerChargesVat({
    sellerRole: offer.listing.seller.role,
    vatRegistered: offer.listing.seller.sellerProfile?.vatRegistered,
  });
  const acceptLinePence = buyerGrossPenceFromSellerNetPence(offer.offeredPrice, acceptChargesVat);
  await createNotification({
    userId: offer.buyerId,
    type: "offer_accepted",
    title: "Offer accepted — complete purchase",
    body: `The seller accepted your offer of £${(acceptLinePence / 100).toFixed(2)}${acceptChargesVat ? " (incl. VAT)" : ""} for “${offer.listing.title}”. Pay from the listing page.`,
    linkUrl: `/listings/${offer.listingId}`,
  });

  revalidatePath(`/listings/${offer.listingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/offers");
  revalidatePath("/dashboard/nearby-stock");
  return { ok: true as const };
}

export async function submitSellerCounterOffer(
  baseOfferId: string,
  counterPricePounds: number,
  message?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in required." };
  }

  const base = await prisma.offer.findUnique({
    where: { id: baseOfferId },
    include: {
      listing: {
        include: {
          seller: { include: { sellerProfile: { select: { vatRegistered: true } } } },
        },
      },
    },
  });
  if (!base || base.listing.sellerId !== session.user.id) {
    return { ok: false as const, error: "Offer not found." };
  }
  if (base.fromSellerCounter) {
    return { ok: false as const, error: "You can only counter a buyer’s offer." };
  }
  const fromPending = base.status === "pending";
  const fromDeclined = base.status === "declined";
  if (!fromPending && !fromDeclined) {
    return {
      ok: false as const,
      error: "You can only counter a pending or declined buyer offer on your listing.",
    };
  }
  if (base.listing.status !== "active") {
    return { ok: false as const, error: "This listing is not active — you can’t send a counter-offer." };
  }
  if (base.listing.listingKind !== "sell" || base.listing.freeToCollector) {
    return { ok: false as const, error: "Offers are not available on this listing." };
  }

  const counterChargesVat = sellerChargesVat({
    sellerRole: base.listing.seller.role,
    vatRegistered: base.listing.seller.sellerProfile?.vatRegistered,
  });
  const offeredPrice = Math.round(counterPricePounds * 100);
  const counterBuyerPence = buyerGrossPenceFromSellerNetPence(offeredPrice, counterChargesVat);
  if (Number.isNaN(offeredPrice) || counterBuyerPence < STRIPE_MIN_AMOUNT_PENCE) {
    return {
      ok: false as const,
      error: `Counter-offer must be at least £${(STRIPE_MIN_AMOUNT_PENCE / 100).toFixed(2)} (card minimum).`,
    };
  }

  const trimmed = message?.trim() || null;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    if (fromPending) {
      await tx.offer.update({
        where: { id: base.id },
        data: { status: "superseded", respondedAt: now },
      });
    }
    await tx.offer.updateMany({
      where: {
        listingId: base.listingId,
        buyerId: base.buyerId,
        fromSellerCounter: true,
        status: "pending",
      },
      data: { status: "withdrawn", respondedAt: now },
    });
    await tx.offer.create({
      data: {
        listingId: base.listingId,
        buyerId: base.buyerId,
        offeredPrice,
        message: trimmed,
        status: "pending",
        fromSellerCounter: true,
      },
    });
  });

  const listingTitle = base.listing.title;
  const counterStr = (counterBuyerPence / 100).toFixed(2);
  const prevBuyerPence = buyerGrossPenceFromSellerNetPence(base.offeredPrice, counterChargesVat);
  const vatTag = counterChargesVat ? " (incl. VAT)" : "";
  const body = fromPending
    ? `The seller countered your offer of £${(prevBuyerPence / 100).toFixed(2)}${vatTag} with £${counterStr}${vatTag} on “${listingTitle}”. Open the listing to accept or decline.`
    : `The seller countered with £${counterStr}${vatTag} on “${listingTitle}”. Open the listing to accept or decline.`;

  await createNotification({
    userId: base.buyerId,
    type: "offer_received",
    title: "Counter-offer from seller",
    body,
    linkUrl: `/listings/${base.listingId}`,
  });

  revalidatePath(`/listings/${base.listingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/offers");
  revalidatePath("/dashboard/nearby-stock");
  return { ok: true as const };
}

export async function buyerRespondToCounterOffer(offerId: string, action: "accept" | "decline") {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in required." };
  }

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      listing: {
        include: {
          seller: { include: { sellerProfile: { select: { vatRegistered: true } } } },
        },
      },
    },
  });
  if (!offer || offer.buyerId !== session.user.id) {
    return { ok: false as const, error: "Offer not found." };
  }
  if (!offer.fromSellerCounter) {
    return { ok: false as const, error: "This is not a seller counter-offer." };
  }
  if (offer.status !== "pending") {
    return { ok: false as const, error: "This counter-offer is no longer pending." };
  }

  const counterOfferChargesVat = sellerChargesVat({
    sellerRole: offer.listing.seller.role,
    vatRegistered: offer.listing.seller.sellerProfile?.vatRegistered,
  });

  const now = new Date();

  if (action === "decline") {
    await prisma.offer.update({
      where: { id: offerId },
      data: { status: "declined", respondedAt: now },
    });
    await createNotification({
      userId: offer.listing.sellerId,
      type: "offer_declined",
      title: "Counter-offer declined",
      body: `${session.user.name ?? session.user.email ?? "The buyer"} declined your counter of £${(offer.offeredPrice / 100).toFixed(2)}${counterOfferChargesVat ? " (ex VAT)" : ""} on “${offer.listing.title}”.`,
      linkUrl: `/dashboard/offers`,
    });
    revalidatePath(`/listings/${offer.listingId}`);
    revalidatePath("/dashboard");
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
    userId: offer.listing.sellerId,
    type: "offer_accepted",
    title: "Counter-offer accepted",
    body: `${session.user.name ?? session.user.email ?? "The buyer"} accepted your counter of £${(offer.offeredPrice / 100).toFixed(2)}${counterOfferChargesVat ? " (ex VAT)" : ""} for “${offer.listing.title}”.`,
    linkUrl: `/listings/${offer.listingId}`,
  });

  revalidatePath(`/listings/${offer.listingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/offers");
  revalidatePath("/dashboard/nearby-stock");
  return { ok: true as const, listingId: offer.listingId };
}
