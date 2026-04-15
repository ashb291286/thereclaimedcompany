"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function fail(message: string): never {
  redirect(`/dashboard/orders?error=${encodeURIComponent(message)}`);
}

async function getSessionUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  return session.user.id;
}

export async function setOrderFulfillmentPlanAction(formData: FormData): Promise<void> {
  const userId = await getSessionUserId();
  const orderId = String(formData.get("orderId") ?? "").trim();
  const method = String(formData.get("method") ?? "").trim();
  const collectionIso = String(formData.get("collectionDateTime") ?? "").trim();
  const courier = String(formData.get("courier") ?? "").trim().slice(0, 120);
  const tracking = String(formData.get("tracking") ?? "").trim().slice(0, 160);
  if (!orderId) fail("Order id is required.");
  if (method !== "collection" && method !== "shipping") fail("Invalid fulfillment method.");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) fail("Order not found.");
  if (order.sellerId !== userId) fail("Only the seller can set fulfillment details.");
  if (order.status !== "paid") fail("Only paid orders can be updated.");

  const data: {
    fulfillmentMethod: string;
    collectionAgreedAt: Date | null;
    shippingCourier: string | null;
    shippingTrackingRef: string | null;
  } = {
    fulfillmentMethod: method,
    collectionAgreedAt: null,
    shippingCourier: null,
    shippingTrackingRef: null,
  };

  if (method === "collection") {
    if (!collectionIso) fail("Set an agreed collection date/time.");
    const parsed = new Date(collectionIso);
    if (Number.isNaN(parsed.getTime())) fail("Invalid collection date/time.");
    data.collectionAgreedAt = parsed;
  } else {
    if (!courier) fail("Enter a courier/service name for shipping.");
    data.shippingCourier = courier;
    data.shippingTrackingRef = tracking || null;
  }

  await prisma.order.update({ where: { id: orderId }, data });
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/admin");
  redirect("/dashboard/orders?updated=fulfillment");
}

export async function confirmOrderCollectionAction(formData: FormData): Promise<void> {
  const userId = await getSessionUserId();
  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) fail("Order id is required.");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) fail("Order not found.");
  if (order.fulfillmentMethod !== "collection") fail("Order is not set to collection.");
  if (order.status !== "paid") fail("Only paid orders can be updated.");
  if (order.sellerId !== userId && order.buyerId !== userId) fail("Not allowed.");

  const now = new Date();
  await prisma.order.update({
    where: { id: orderId },
    data:
      order.sellerId === userId
        ? { collectionConfirmedBySellerAt: order.collectionConfirmedBySellerAt ?? now }
        : { collectionConfirmedByBuyerAt: order.collectionConfirmedByBuyerAt ?? now },
  });
  revalidatePath("/dashboard/orders");
  redirect("/dashboard/orders?updated=collection");
}

export async function confirmOrderShipmentAction(formData: FormData): Promise<void> {
  const userId = await getSessionUserId();
  const orderId = String(formData.get("orderId") ?? "").trim();
  const courier = String(formData.get("courier") ?? "").trim().slice(0, 120);
  const tracking = String(formData.get("tracking") ?? "").trim().slice(0, 160);
  if (!orderId) fail("Order id is required.");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) fail("Order not found.");
  if (order.sellerId !== userId) fail("Only the seller can confirm shipment.");
  if (order.fulfillmentMethod !== "shipping") fail("Order is not set to shipping.");
  if (!courier) fail("Courier/service is required.");
  if (order.status !== "paid") fail("Only paid orders can be updated.");

  await prisma.order.update({
    where: { id: orderId },
    data: {
      shippingCourier: courier,
      shippingTrackingRef: tracking || null,
      shippingConfirmedAt: order.shippingConfirmedAt ?? new Date(),
    },
  });
  revalidatePath("/dashboard/orders");
  redirect("/dashboard/orders?updated=shipping");
}

export async function confirmOrderReceiptAction(formData: FormData): Promise<void> {
  const userId = await getSessionUserId();
  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) fail("Order id is required.");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) fail("Order not found.");
  if (order.buyerId !== userId) fail("Only the buyer can confirm receipt.");
  if (order.fulfillmentMethod !== "shipping") fail("Order is not set to shipping.");
  if (order.status !== "paid") fail("Only paid orders can be updated.");

  await prisma.order.update({
    where: { id: orderId },
    data: { deliveryConfirmedAt: order.deliveryConfirmedAt ?? new Date() },
  });
  revalidatePath("/dashboard/orders");
  redirect("/dashboard/orders?updated=received");
}

export async function leaveOrderReviewAction(formData: FormData): Promise<void> {
  const userId = await getSessionUserId();
  const orderId = String(formData.get("orderId") ?? "").trim();
  const ratingRaw = parseInt(String(formData.get("rating") ?? "0"), 10);
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 1000);
  if (!orderId) fail("Order id is required.");
  if (!Number.isFinite(ratingRaw) || ratingRaw < 1 || ratingRaw > 5) fail("Rating must be 1 to 5.");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) fail("Order not found.");
  if (order.status !== "paid") fail("Only paid orders can be reviewed.");
  const completeCollection =
    order.fulfillmentMethod === "collection" &&
    order.collectionConfirmedByBuyerAt &&
    order.collectionConfirmedBySellerAt;
  const completeShipping =
    order.fulfillmentMethod === "shipping" && order.shippingConfirmedAt && order.deliveryConfirmedAt;
  if (!completeCollection && !completeShipping) {
    fail("Complete collection or delivery confirmations before reviewing.");
  }

  if (order.buyerId === userId) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        buyerReviewRating: ratingRaw,
        buyerReviewComment: comment || null,
        buyerReviewedAt: new Date(),
      },
    });
  } else if (order.sellerId === userId) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        sellerReviewRating: ratingRaw,
        sellerReviewComment: comment || null,
        sellerReviewedAt: new Date(),
      },
    });
  } else {
    fail("Not allowed.");
  }

  revalidatePath("/dashboard/orders");
  redirect("/dashboard/orders?updated=review");
}
