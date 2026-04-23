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
  const imageUrlsRaw = String(formData.get("imageUrls") ?? "").trim();
  const imageUrls = imageUrlsRaw
    ? imageUrlsRaw
        .split(",")
        .map((u) => u.trim())
        .filter((u) => u.startsWith("https://"))
        .slice(0, 6)
    : [];
  if (!listingId || (!message && imageUrls.length === 0)) {
    redirect(`/dashboard/deals/${listingId}`);
  }

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

  const body =
    message.slice(0, 4000) || (imageUrls.length ? (imageUrls.length > 1 ? "Images shared" : "Image shared") : "");

  await prisma.dealerDealMessage.create({
    data: {
      dealId: deal.id,
      senderId: session.user.id,
      body,
      imageUrls,
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
  const itemPounds = parseFloat(String(formData.get("agreedItemTotal") ?? ""));
  const buyerArrangesShipping = String(formData.get("buyerArrangesShipping") ?? "") === "on";
  const shippingPounds = buyerArrangesShipping
    ? 0
    : parseFloat(String(formData.get("shippingPounds") ?? ""));

  const note = String(formData.get("note") ?? "").trim();

  if (!listingId || !buyerId || !Number.isFinite(itemPounds) || itemPounds <= 0) {
    redirect(`/dashboard/deals/${listingId}?error=invalid_deal_total`);
  }
  if (!buyerArrangesShipping && (!Number.isFinite(shippingPounds) || shippingPounds < 0)) {
    redirect(`/dashboard/deals/${listingId}?error=invalid_shipping`);
  }
  const itemPence = Math.round(itemPounds * 100);
  const shippingPence = buyerArrangesShipping ? 0 : Math.round(shippingPounds * 100);
  const offeredPrice = itemPence + shippingPence;
  if (offeredPrice < 1) {
    redirect(`/dashboard/deals/${listingId}?error=invalid_deal_total`);
  }
  const amountPounds = offeredPrice / 100;

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
    const shipLine = buyerArrangesShipping
      ? "Buyer arranges shipping."
      : `Dealer-quoted shipping: £${(shippingPence / 100).toFixed(2)}.`;
    const offerMessageParts = [
      `Dealer agreed item: £${itemPounds.toFixed(2)}. ${shipLine} Total: £${amountPounds.toFixed(2)}.`,
    ];
    if (note) offerMessageParts.push(note);
    const createdOffer = await tx.offer.create({
      data: {
        listingId,
        buyerId,
        offeredPrice,
        message: offerMessageParts.join(" "),
        status: "accepted",
        fromSellerCounter: true,
        respondedAt: now,
      },
    });
    const threadMsg = [
      `Deal presented — item £${itemPounds.toFixed(2)}`,
      buyerArrangesShipping
        ? "buyer arranges shipping"
        : `shipping £${(shippingPence / 100).toFixed(2)}`,
      `total £${amountPounds.toFixed(2)}`,
    ]
      .join(", ")
      .concat(note ? `. ${note}` : ".");
    await tx.dealerDeal.update({
      where: { id: deal.id },
      data: {
        status: "presented",
        agreedOfferId: createdOffer.id,
        buyerArrangesShipping,
        agreedItemPence: itemPence,
        agreedShippingPence: shippingPence,
        messages: {
          create: {
            senderId: session.user.id,
            body: threadMsg,
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
