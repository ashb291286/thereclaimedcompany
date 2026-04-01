"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

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

  return { ok: true as const };
}
