import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!sellerProfile) {
    return NextResponse.json(
      { error: "Seller profile required. Complete onboarding first." },
      { status: 400 }
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const returnUrl = `${baseUrl}/dashboard?stripe=success`;
  const refreshUrl = `${baseUrl}/dashboard?stripe=refresh`;

  try {
    let accountId = sellerProfile.stripeAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "GB",
      });
      accountId = account.id;
      await prisma.sellerProfile.update({
        where: { id: sellerProfile.id },
        data: { stripeAccountId: accountId },
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (e) {
    console.error("Stripe Connect create-link error:", e);
    return NextResponse.json(
      { error: "Failed to create onboarding link" },
      { status: 500 }
    );
  }
}
