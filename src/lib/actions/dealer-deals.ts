"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** In-app + deep-link for the dealer thread (must include `buyer` so sellers land on the right thread). */
export async function notifyDealerOfNewPrivateDealEnquiry(input: {
  sellerId: string;
  listingId: string;
  listingTitle: string;
  buyerId: string;
  buyerLabel: string;
}) {
  await createNotification({
    userId: input.sellerId,
    type: "dealer_deal_enquiry",
    title: "New private enquiry",
    body: `${input.buyerLabel} opened a private deal discussion for “${input.listingTitle}”.`,
    linkUrl: `/dashboard/deals/${input.listingId}?buyer=${input.buyerId}`,
  });
}

export async function ensureDealerDealForListingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const listingId = String(formData.get("listingId") ?? "").trim();
  if (!listingId) redirect("/search");

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true, seller: { select: { role: true } }, title: true, status: true },
  });
  if (!listing || listing.status !== "active" || listing.seller.role !== "dealer") {
    redirect(`/listings/${listingId}`);
  }
  if (listing.sellerId === session.user.id) {
    redirect(`/dashboard/deals/${listingId}`);
  }

  const existing = await prisma.dealerDeal.findUnique({
    where: { listingId_buyerId: { listingId, buyerId: session.user.id } },
  });

  await prisma.dealerDeal.upsert({
    where: {
      listingId_buyerId: {
        listingId,
        buyerId: session.user.id,
      },
    },
    update: { updatedAt: new Date() },
    create: {
      listingId,
      buyerId: session.user.id,
      sellerId: listing.sellerId,
      messages: {
        create: {
          senderId: session.user.id,
          body: "I would like to enquire about this piece.",
        },
      },
    },
  });

  if (!existing) {
    await notifyDealerOfNewPrivateDealEnquiry({
      sellerId: listing.sellerId,
      listingId,
      listingTitle: listing.title,
      buyerId: session.user.id,
      buyerLabel: session.user.name ?? session.user.email ?? "A buyer",
    });
  }

  revalidatePath(`/dashboard/deals/${listingId}`);
  revalidatePath("/dashboard/deals");
  redirect(`/dashboard/deals/${listingId}`);
}

export async function postDealerDealMessageAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const listingId = String(formData.get("listingId") ?? "").trim();
  const buyerId = String(formData.get("buyerId") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!listingId || !message) redirect(`/dashboard/deals/${listingId}`);

  const deal = await prisma.dealerDeal.findUnique({
    where: { listingId_buyerId: { listingId, buyerId } },
    select: {
      id: true,
      sellerId: true,
      buyerId: true,
      listing: { select: { title: true } },
    },
  });
  if (!deal) redirect(`/dashboard/deals/${listingId}`);
  if (session.user.id !== deal.buyerId && session.user.id !== deal.sellerId) {
    redirect("/dashboard/deals?error=forbidden");
  }

  await prisma.dealerDealMessage.create({
    data: {
      dealId: deal.id,
      senderId: session.user.id,
      body: message.slice(0, 4000),
    },
  });

  const notifyUserId = session.user.id === deal.buyerId ? deal.sellerId : deal.buyerId;
  await createNotification({
    userId: notifyUserId,
    type: "dealer_deal_message",
    title: "New deal message",
    body: `There is a new message on the deal thread for “${deal.listing.title}”.`,
    linkUrl: `/dashboard/deals/${listingId}?buyer=${deal.buyerId}`,
  });

  revalidatePath(`/dashboard/deals/${listingId}`);
}

export async function presentDealerDealAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const listingId = String(formData.get("listingId") ?? "").trim();
  const buyerId = String(formData.get("buyerId") ?? "").trim();
  const amountPounds = parseFloat(String(formData.get("agreedTotal") ?? ""));
  const note = String(formData.get("note") ?? "").trim();

  if (!listingId || !buyerId || !Number.isFinite(amountPounds) || amountPounds <= 0) {
    redirect(`/dashboard/deals/${listingId}?error=invalid_deal_total`);
  }
  const offeredPrice = Math.round(amountPounds * 100);

  const deal = await prisma.dealerDeal.findUnique({
    where: { listingId_buyerId: { listingId, buyerId } },
    include: {
      listing: { select: { title: true, sellerId: true, listingKind: true, freeToCollector: true, status: true } },
    },
  });
  if (!deal || deal.listing.sellerId !== session.user.id) {
    redirect("/dashboard/deals?error=deal_not_found");
  }
  if (deal.listing.listingKind !== "sell" || deal.listing.freeToCollector || deal.listing.status !== "active") {
    redirect(`/dashboard/deals/${listingId}?error=listing_not_eligible`);
  }

  const now = new Date();
  const offer = await prisma.$transaction(async (tx) => {
    await tx.offer.updateMany({
      where: {
        listingId,
        buyerId,
        status: "pending",
      },
      data: { status: "superseded", respondedAt: now },
    });
    const createdOffer = await tx.offer.create({
      data: {
        listingId,
        buyerId,
        offeredPrice,
        message: note ? `Dealer agreed total: £${amountPounds.toFixed(2)}. ${note}` : `Dealer agreed total: £${amountPounds.toFixed(2)}.`,
        status: "accepted",
        fromSellerCounter: true,
        respondedAt: now,
      },
    });
    await tx.dealerDeal.update({
      where: { id: deal.id },
      data: {
        status: "presented",
        agreedOfferId: createdOffer.id,
        messages: {
          create: {
            senderId: session.user.id,
            body: note
              ? `Deal presented at £${amountPounds.toFixed(2)}. ${note}`
              : `Deal presented at £${amountPounds.toFixed(2)}.`,
          },
        },
      },
    });
    return createdOffer;
  });

  await createNotification({
    userId: buyerId,
    type: "dealer_deal_presented",
    title: "Dealer has presented your private deal",
    body: `Your agreed deal for “${deal.listing.title}” is ready to check out.`,
    linkUrl: `/dashboard/deals/${listingId}`,
  });

  revalidatePath(`/dashboard/deals/${listingId}`);
  revalidatePath(`/listings/${listingId}`);
  redirect(`/dashboard/deals/${listingId}?dealPresented=${offer.id}`);
}
