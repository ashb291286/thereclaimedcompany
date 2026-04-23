import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BuyButton } from "@/app/(marketing)/listings/[id]/BuyButton";
import {
  notifyDealerOfNewPrivateDealEnquiry,
  presentDealerDealAction,
} from "@/lib/actions/dealer-deals";
import { revalidatePath } from "next/cache";
import { sellerChargesVat, vatLabelSuffix } from "@/lib/vat-pricing";
import { buyerGrossPenceFromSellerNetPence } from "@/lib/vat-pricing";
import { DealerDealProvenancePanel } from "@/components/deals/DealerDealProvenancePanel";
import { DealerDealMessageForm } from "@/components/deals/DealerDealMessageForm";

export default async function DealerDealThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<{ buyer?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { listingId } = await params;
  const { buyer, error: dealError } = await searchParams;

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      seller: { include: { sellerProfile: true } },
      category: { select: { name: true } },
    },
  });
  if (!listing || listing.seller.role !== "dealer") notFound();

  const isSeller = session.user.id === listing.sellerId;
  let buyerId = buyer?.trim() || "";
  if (!isSeller) buyerId = session.user.id;
  if (!buyerId) {
    const latest = await prisma.dealerDeal.findFirst({
      where: { listingId, sellerId: listing.sellerId },
      orderBy: { updatedAt: "desc" },
      select: { buyerId: true },
    });
    if (!latest) {
      return (
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Private deal</h1>
          <p className="mt-2 text-sm text-zinc-600">No buyer thread selected yet for this listing.</p>
        </div>
      );
    }
    buyerId = latest.buyerId;
  }

  let deal = await prisma.dealerDeal.findUnique({
    where: { listingId_buyerId: { listingId, buyerId } },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
      agreedOffer: { select: { id: true, offeredPrice: true } },
      messages: {
        include: { sender: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!deal && !isSeller && session.user.id !== listing.sellerId) {
    deal = await prisma.dealerDeal.create({
      data: {
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
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
        agreedOffer: { select: { id: true, offeredPrice: true } },
        messages: {
          include: { sender: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    await notifyDealerOfNewPrivateDealEnquiry({
      sellerId: listing.sellerId,
      listingId,
      listingTitle: listing.title,
      buyerId: session.user.id,
      buyerLabel: session.user.name ?? session.user.email ?? "A buyer",
    });
    revalidatePath(`/dashboard/deals/${listingId}`);
    revalidatePath("/dashboard/deals");
  }
  if (!deal) {
    deal = await prisma.dealerDeal.findUnique({
      where: { listingId_buyerId: { listingId, buyerId } },
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
        agreedOffer: { select: { id: true, offeredPrice: true } },
        messages: {
          include: { sender: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  if (!deal) notFound();
  if (session.user.id !== deal.buyerId && session.user.id !== deal.sellerId) notFound();

  const chargesVat = sellerChargesVat({
    sellerRole: listing.seller.role,
    vatRegistered: listing.seller.sellerProfile?.vatRegistered,
  });
  const agreedBuyerGross =
    deal.agreedOffer?.offeredPrice != null
      ? buyerGrossPenceFromSellerNetPence(deal.agreedOffer.offeredPrice, chargesVat)
      : null;

  const hasShippingBreakdown =
    deal.agreedItemPence != null &&
    deal.agreedShippingPence != null &&
    deal.buyerArrangesShipping != null &&
    deal.agreedOffer;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Private deal thread</h1>
        <Link href="/dashboard/deals" className="text-sm text-brand underline">
          All deal threads
        </Link>
      </div>

      {dealError === "invalid_deal_total" ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Enter a valid agreed item price (and total must be at least 1p).
        </p>
      ) : null}
      {dealError === "invalid_shipping" ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          When the dealer arranges delivery, add a valid shipping amount (0 or more).
        </p>
      ) : null}
      {dealError === "listing_not_eligible" ? (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          This listing is not eligible for a presented deal.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {deal.buyer.name ?? deal.buyer.email ?? "Buyer"} ↔ {deal.seller.name ?? deal.seller.email ?? "Dealer"}
          </p>
          <div className="mt-4 space-y-3">
            {deal.messages.map((m) => {
              const mine = m.senderId === session.user.id;
              const images = m.imageUrls?.length ? m.imageUrls : [];
              return (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    mine ? "ml-auto bg-brand text-white" : "bg-zinc-100 text-zinc-800"
                  }`}
                >
                  {m.body.trim() ? <p className="whitespace-pre-wrap">{m.body}</p> : null}
                  {images.length > 0 ? (
                    <div className={`mt-2 flex flex-wrap gap-1.5 ${m.body.trim() ? "" : ""}`}>
                      {images.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block overflow-hidden rounded-lg border border-white/20"
                        >
                          <img
                            src={url}
                            alt=""
                            className="h-28 w-28 object-cover sm:h-32 sm:w-32"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}
                  <p className={`mt-1 text-[11px] ${mine ? "text-white/75" : "text-zinc-500"}`}>
                    {m.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              );
            })}
          </div>
          <DealerDealMessageForm listingId={listingId} buyerId={deal.buyerId} />
          <DealerDealProvenancePanel listing={listing} />
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Piece details</p>
            <p className="mt-2 font-semibold text-zinc-900">{listing.title}</p>
            <p className="mt-1 text-sm text-zinc-600">{listing.category.name}</p>
            <p className="mt-2 text-sm text-zinc-700">
              List price £{(buyerGrossPenceFromSellerNetPence(listing.price, chargesVat) / 100).toFixed(2)}
              {vatLabelSuffix(chargesVat)}
            </p>
            {listing.images[0] ? (
              <img src={listing.images[0]} alt="" className="mt-3 h-40 w-full rounded-lg object-cover" />
            ) : null}
          </section>

          {isSeller && !deal.agreedOffer ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="text-sm font-semibold text-amber-950">Present agreed deal</p>
              <p className="mt-1 text-xs text-amber-900/90">
                Set the item price, then either let the buyer arrange shipping or add a dealer-quoted shipping line that
                is included in the checkout total.
              </p>
              <form action={presentDealerDealAction} className="mt-3 space-y-3">
                <input type="hidden" name="listingId" value={listingId} />
                <input type="hidden" name="buyerId" value={deal.buyerId} />
                <div>
                  <label className="mb-1 block text-xs font-medium text-amber-950">Agreed item price (£)</label>
                  <input
                    name="agreedItemTotal"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm"
                  />
                </div>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-amber-950">
                  <input
                    type="checkbox"
                    name="buyerArrangesShipping"
                    value="on"
                    defaultChecked
                    className="mt-1 h-4 w-4 rounded border-amber-400"
                  />
                  <span>
                    <span className="font-medium">Buyer arranges shipping / collection</span>
                    <span className="mt-0.5 block text-xs font-normal text-amber-900/85">
                      No extra delivery line is added to the total (buyer organises with you separately).
                    </span>
                  </span>
                </label>
                <div>
                  <label className="mb-1 block text-xs font-medium text-amber-950">
                    Dealer-quoted shipping (£) <span className="font-normal text-amber-800">(if not ticked above)</span>
                  </label>
                  <input
                    name="shippingPounds"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm"
                  />
                </div>
                <textarea
                  name="note"
                  rows={2}
                  placeholder="Optional note for customer"
                  className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-950"
                >
                  Present deal to customer
                </button>
              </form>
            </section>
          ) : isSeller && deal.agreedOffer ? (
            <section className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 text-sm text-amber-950">
              <p className="font-semibold">A deal is already presented</p>
              <p className="mt-1 text-xs text-amber-900/90">The customer can use checkout on the right. Contact support to change an accepted offer.</p>
            </section>
          ) : deal.agreedOffer ? (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <p className="text-sm font-semibold text-emerald-950">Deal ready for checkout</p>
              {hasShippingBreakdown ? (
                <div className="mt-2 space-y-1 text-sm text-emerald-900">
                  <p>
                    Item: £
                    {(buyerGrossPenceFromSellerNetPence(deal.agreedItemPence!, chargesVat) / 100).toFixed(2)}
                    {vatLabelSuffix(chargesVat)}
                  </p>
                  {deal.buyerArrangesShipping ? (
                    <p>Shipping: buyer arranges (not added to the payment total here)</p>
                  ) : (
                    <p>
                      Shipping: £
                      {(buyerGrossPenceFromSellerNetPence(deal.agreedShippingPence!, chargesVat) / 100).toFixed(2)}
                      {vatLabelSuffix(chargesVat)}
                    </p>
                  )}
                  <p className="border-t border-emerald-200/80 pt-1 font-semibold">
                    Total: £{((agreedBuyerGross ?? deal.agreedOffer.offeredPrice) / 100).toFixed(2)}
                    {vatLabelSuffix(chargesVat)}
                  </p>
                </div>
              ) : (
                <p className="mt-1 text-sm text-emerald-900">
                  Agreed total: £{((agreedBuyerGross ?? deal.agreedOffer.offeredPrice) / 100).toFixed(2)}
                  {vatLabelSuffix(chargesVat)}
                </p>
              )}
              <div className="mt-3">
                <BuyButton
                  listingId={listing.id}
                  offerId={deal.agreedOffer.id}
                  label="Secure this deal now"
                />
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              Waiting for dealer to present an agreed deal total.
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
