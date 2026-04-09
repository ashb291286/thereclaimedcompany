"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type BidCardSummary = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

/** Server-only: card on file for auction auto-charge (Stripe + DB). */
export async function getBidCardSummaryForUser(userId: string): Promise<BidCardSummary | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { bidPaymentMethodId: true, stripeCustomerId: true },
  });
  if (!user?.bidPaymentMethodId?.trim() || !user.stripeCustomerId) return null;
  try {
    const pm = await stripe.paymentMethods.retrieve(user.bidPaymentMethodId);
    if (pm.type !== "card" || !pm.card) return null;
    return {
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
    };
  } catch {
    return null;
  }
}

export async function saveBidPaymentMethod(paymentMethodId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sign in to save a card." };
  }
  const trimmed = paymentMethodId.trim();
  if (!trimmed) {
    return { ok: false as const, error: "Missing payment method." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.stripeCustomerId) {
    return { ok: false as const, error: "Payment setup not started. Try again." };
  }

  const pm = await stripe.paymentMethods.retrieve(trimmed);
  const cust = typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
  if (cust !== user.stripeCustomerId) {
    return { ok: false as const, error: "This card does not belong to your account." };
  }

  try {
    await stripe.paymentMethods.attach(trimmed, { customer: user.stripeCustomerId });
  } catch {
    // Often already attached after SetupIntent confirmation
  }

  await stripe.customers.update(user.stripeCustomerId, {
    invoice_settings: { default_payment_method: trimmed },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { bidPaymentMethodId: trimmed },
  });

  revalidatePath("/dashboard/account");

  return { ok: true as const };
}

export async function clearBidPaymentMethodAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=%2Fdashboard%2Faccount");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, bidPaymentMethodId: true, stripeCustomerId: true },
  });
  if (!user?.bidPaymentMethodId) {
    redirect("/dashboard/account");
  }

  const pmId = user.bidPaymentMethodId;

  try {
    await stripe.paymentMethods.detach(pmId);
  } catch {
    /* already detached or not attached to this account */
  }

  if (user.stripeCustomerId) {
    try {
      const cust = await stripe.customers.retrieve(user.stripeCustomerId);
      if (cust && !cust.deleted && typeof cust !== "string") {
        const def = cust.invoice_settings?.default_payment_method;
        const defId = typeof def === "string" ? def : def?.id;
        if (defId === pmId) {
          await stripe.customers.update(user.stripeCustomerId, {
            invoice_settings: { default_payment_method: undefined },
          });
        }
      }
    } catch {
      /* ignore */
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { bidPaymentMethodId: null },
  });

  revalidatePath("/dashboard/account");
  redirect(
    "/dashboard/account?ok=" +
      encodeURIComponent("Your card for auction bidding has been removed. Add a new card before you place bids.")
  );
}
