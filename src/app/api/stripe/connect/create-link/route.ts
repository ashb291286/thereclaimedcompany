import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getSiteBaseUrl } from "@/lib/site-url";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
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

  let flow: "dashboard" | "onboarding" = "dashboard";
  try {
    const body = (await req.json().catch(() => ({}))) as { flow?: string };
    if (body?.flow === "onboarding") flow = "onboarding";
  } catch {
    /* ignore */
  }

  const baseUrl = getSiteBaseUrl();
  const returnUrl =
    flow === "onboarding"
      ? `${baseUrl}/dashboard/onboarding?phase=complete&stripe=success`
      : `${baseUrl}/dashboard?stripe=success`;
  const refreshUrl =
    flow === "onboarding"
      ? `${baseUrl}/dashboard/onboarding?phase=payments&stripe=refresh`
      : `${baseUrl}/dashboard?stripe=refresh`;

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
