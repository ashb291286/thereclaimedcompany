"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getSiteBaseUrl } from "@/lib/site-url";
import { removeListingFromWooCommerce } from "@/lib/listing-woocommerce-sync";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function withQuery(base: string, params: Record<string, string>): string {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

function boostReturnPaths(formData: FormData): { success: string; cancel: string } {
  const raw = String(formData.get("boostReturn") ?? "").trim();
  const baseUrl = getSiteBaseUrl();
  if (raw === "listings") {
    return {
      success: `${baseUrl}/dashboard/listings?boosted=1`,
      cancel: `${baseUrl}/dashboard/listings`,
    };
  }
  return {
    success: `${baseUrl}/dashboard?boosted=1`,
    cancel: `${baseUrl}/dashboard`,
  };
}

export async function sellerBoostListingCheckoutAction(formData: FormData): Promise<void> {
  const current = await auth();
  if (!current?.user?.id) redirect("/auth/signin");
  const id = String(formData.get("listingId") ?? "");
  if (!id) return;
  const listing = await prisma.listing.findFirst({
    where: { id, sellerId: current.user.id, status: "active" },
    select: { id: true, title: true },
  });
  const { success, cancel } = boostReturnPaths(formData);
  if (!listing) redirect(withQuery(cancel, { boostError: "not-active" }));

  const fullUser = await prisma.user.findUnique({
    where: { id: current.user.id },
    select: { email: true, stripeCustomerId: true },
  });
  if (!fullUser) redirect(withQuery(cancel, { boostError: "user" }));

  let customerId = fullUser.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: fullUser.email ?? undefined,
      metadata: { userId: current.user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: current.user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "gbp",
          unit_amount: 500,
          product_data: {
            name: "Listing boost (7 days)",
            description: `${listing.title} — featured promotion to local reclamation yards`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: success,
    cancel_url: cancel,
    metadata: {
      kind: "listing_boost",
      listingId: listing.id,
      sellerId: current.user.id,
    },
  });

  if (!checkoutSession.url) redirect(withQuery(cancel, { boostError: "checkout" }));
  redirect(checkoutSession.url);
}

export async function sellerDeleteOwnListingAction(formData: FormData): Promise<void> {
  const current = await auth();
  if (!current?.user?.id) redirect("/auth/signin");
  const id = String(formData.get("listingId") ?? "");
  if (!id) return;
  await removeListingFromWooCommerce(id);
  await prisma.listing.deleteMany({
    where: { id, sellerId: current.user.id },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/listings");
  revalidatePath(`/listings/${id}`);
}
