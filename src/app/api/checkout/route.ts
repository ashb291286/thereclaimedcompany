import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { purchaseCarbonSnapshotFromListing } from "@/lib/order-carbon";
import { ListingPricingMode } from "@/generated/prisma/client";
import { STRIPE_MIN_AMOUNT_PENCE } from "@/lib/constants";
import { buyerGrossPenceFromSellerNetPence, sellerChargesVat } from "@/lib/vat-pricing";
import { getSiteBaseUrl } from "@/lib/site-url";
import { calculateMarketplaceFees, getMarketplaceFeeSettings } from "@/lib/marketplace-fees";
import { NextResponse } from "next/server";

const MAX_CHECKOUT_QUANTITY = 10_000;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in to purchase" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const listingId = body.listingId as string | undefined;
  const offerId = body.offerId as string | undefined;
  const bidId = body.bidId as string | undefined;
  const rawQty = body.quantity;
  let quantity = 1;
  if (rawQty != null) {
    const q = typeof rawQty === "number" ? rawQty : parseInt(String(rawQty), 10);
    if (Number.isFinite(q) && q >= 1) {
      quantity = Math.min(Math.floor(q), MAX_CHECKOUT_QUANTITY);
    }
  }

  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }

  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      OR: [{ status: "active" }, { status: "payment_pending" }],
    },
    include: {
      seller: { include: { sellerProfile: true } },
    },
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found or not available" }, { status: 404 });
  }
  if (!listing.visibleOnMarketplace) {
    return NextResponse.json(
      { error: "This item is not for sale on the marketplace — hire it via The Prop Yard if available." },
      { status: 400 }
    );
  }
  if (listing.sellerId === session.user.id) {
    return NextResponse.json({ error: "Cannot buy your own listing" }, { status: 400 });
  }

  const baseUrl = getSiteBaseUrl();

  // Free to collector — no Stripe
  if (listing.listingKind === "sell" && listing.freeToCollector && listing.price === 0) {
    if (listing.pricingMode === ListingPricingMode.PER_UNIT) {
      const max = listing.unitsAvailable ?? 0;
      if (max < 1) {
        return NextResponse.json({ error: "This listing is sold out" }, { status: 400 });
      }
      if (quantity < 1 || quantity > max) {
        return NextResponse.json(
          { error: `Choose a quantity between 1 and ${max}` },
          { status: 400 }
        );
      }
    } else {
      quantity = 1;
    }

    const carbonSnap = purchaseCarbonSnapshotFromListing(listing);
    await prisma.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          listingId,
          buyerId: session.user.id,
          sellerId: listing.sellerId,
          amount: 0,
          platformFee: 0,
          status: "paid",
          quantity,
          ...carbonSnap,
        },
      });
      const row = await tx.listing.findUnique({ where: { id: listingId } });
      if (
        row?.pricingMode === ListingPricingMode.PER_UNIT &&
        row.unitsAvailable != null
      ) {
        const rem = row.unitsAvailable - quantity;
        await tx.listing.update({
          where: { id: listingId },
          data: {
            unitsAvailable: rem > 0 ? rem : null,
            status: rem <= 0 ? "sold" : "active",
          },
        });
      } else {
        await tx.listing.update({
          where: { id: listingId },
          data: { status: "sold" },
        });
      }
    });
    return NextResponse.json({ url: `${baseUrl}/orders?collected=1` });
  }

  const sellerProfile = listing.seller?.sellerProfile;
  const stripeAccountId = sellerProfile?.stripeAccountId;
  if (!stripeAccountId) {
    return NextResponse.json(
      { error: "Seller has not set up payments yet" },
      { status: 400 }
    );
  }

  let amount = listing.price;
  let metadataOfferId = "";
  let metadataBidId = "";
  let lineUnitAmount = listing.price;
  let lineQuantity = 1;

  if (listing.listingKind === "auction") {
    const ended =
      listing.status === "payment_pending" ||
      Boolean(listing.auctionEndsAt && new Date() > listing.auctionEndsAt);
    if (!ended) {
      return NextResponse.json(
        { error: "This auction is still open — place a bid instead." },
        { status: 400 }
      );
    }
    if (!bidId) {
      return NextResponse.json(
        { error: "Use the Pay winning bid button if you won the auction." },
        { status: 400 }
      );
    }
    const bid = await prisma.bid.findFirst({
      where: { id: bidId, listingId, bidderId: session.user.id },
    });
    if (!bid) {
      return NextResponse.json({ error: "Invalid bid" }, { status: 400 });
    }
    const top = await prisma.bid.findFirst({
      where: { listingId },
      orderBy: { amountPence: "desc" },
    });
    if (!top || top.id !== bid.id) {
      return NextResponse.json({ error: "Only the winning bidder can pay" }, { status: 400 });
    }
    amount = bid.amountPence;
    metadataBidId = bid.id;
    quantity = 1;
    lineUnitAmount = amount;
    lineQuantity = 1;
  } else if (offerId) {
    const offer = await prisma.offer.findFirst({
      where: {
        id: offerId,
        listingId,
        buyerId: session.user.id,
        status: "accepted",
      },
    });
    if (!offer) {
      return NextResponse.json({ error: "No accepted offer found for you on this listing" }, { status: 400 });
    }
    amount = offer.offeredPrice;
    metadataOfferId = offer.id;
    quantity = 1;
    lineUnitAmount = amount;
    lineQuantity = 1;
  } else if (
    listing.listingKind === "sell" &&
    listing.pricingMode === ListingPricingMode.PER_UNIT
  ) {
    const max = listing.unitsAvailable ?? 0;
    if (max < 1) {
      return NextResponse.json({ error: "This listing is sold out" }, { status: 400 });
    }
    if (quantity < 1 || quantity > max) {
      return NextResponse.json(
        { error: `Choose a quantity between 1 and ${max}` },
        { status: 400 }
      );
    }
    lineUnitAmount = listing.price;
    lineQuantity = quantity;
    amount = listing.price * quantity;
  } else {
    quantity = 1;
    lineUnitAmount = listing.price;
    lineQuantity = 1;
    amount = listing.price;
  }

  const chargesVat = sellerChargesVat({
    sellerRole: listing.seller?.role,
    vatRegistered: listing.seller?.sellerProfile?.vatRegistered,
  });
  if (chargesVat) {
    lineUnitAmount = buyerGrossPenceFromSellerNetPence(lineUnitAmount, true);
    amount = lineUnitAmount * lineQuantity;
  }

  if (amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  if (
    listing.listingKind === "sell" &&
    !listing.freeToCollector &&
    !offerId &&
    !bidId &&
    amount < STRIPE_MIN_AMOUNT_PENCE
  ) {
    return NextResponse.json(
      { error: `Order total must be at least £${(STRIPE_MIN_AMOUNT_PENCE / 100).toFixed(2)}` },
      { status: 400 }
    );
  }

  const feeSettings = await getMarketplaceFeeSettings();
  const feeBreakdown = calculateMarketplaceFees(amount, feeSettings);
  const applicationFeeAmount = feeBreakdown.totalMarketplaceFeesPence;

  const carbonLine =
    listing.carbonSavedKg != null && listing.carbonSavedKg > 0
      ? ` Saves ~${Math.round(listing.carbonSavedKg)} kg CO₂e vs new production (ICE-style factors).`
      : "";
  const productDescription = (listing.description.slice(0, 420) + carbonLine).slice(0, 500);

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: stripeAccountId,
        },
      },
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: lineUnitAmount,
            product_data: {
              name: listing.title,
              description: productDescription,
              images: listing.images.length ? [listing.images[0]] : undefined,
            },
          },
          quantity: lineQuantity,
        },
      ],
      success_url: `${baseUrl}/orders?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/listings/${listingId}`,
      client_reference_id: listingId,
      metadata: {
        listingId,
        buyerId: session.user.id,
        sellerId: listing.sellerId,
        amount: String(amount),
        platformFee: String(applicationFeeAmount),
          fee_commission_net: String(feeBreakdown.commissionNetPence),
          fee_commission_vat: String(feeBreakdown.commissionVatPence),
          fee_commission_gross: String(feeBreakdown.commissionGrossPence),
          fee_stripe_processing: String(feeBreakdown.stripeProcessingFeePence),
          fee_digital_marketplace: String(feeBreakdown.digitalMarketplaceFeePence),
          fee_seller_payout: String(feeBreakdown.sellerPayoutPence),
        quantity: String(quantity),
        ...(metadataOfferId ? { offerId: metadataOfferId } : {}),
        ...(metadataBidId ? { bidId: metadataBidId } : {}),
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    console.error("Checkout error:", e);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
