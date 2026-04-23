import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BuyButton } from "@/app/(marketing)/listings/[id]/BuyButton";
import {
  notifyDealerOfNewPrivateDealEnquiry,
  postDealerDealMessageAction,
  presentDealerDealAction,
} from "@/lib/actions/dealer-deals";
import { revalidatePath } from "next/cache";
import { sellerChargesVat, vatLabelSuffix } from "@/lib/vat-pricing";
import { buyerGrossPenceFromSellerNetPence } from "@/lib/vat-pricing";

export default async function DealerDealThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<{ buyer?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const { listingId } = await params;
  const { buyer } = await searchParams;

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

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Private deal thread</h1>
        <Link href="/dashboard/deals" className="text-sm text-brand underline">
          All deal threads
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {deal.buyer.name ?? deal.buyer.email ?? "Buyer"} ↔ {deal.seller.name ?? deal.seller.email ?? "Dealer"}
          </p>
          <div className="mt-4 space-y-3">
            {deal.messages.map((m) => {
              const mine = m.senderId === session.user.id;
              return (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    mine ? "ml-auto bg-brand text-white" : "bg-zinc-100 text-zinc-800"
                  }`}
                >
                  <p>{m.body}</p>
                  <p className={`mt-1 text-[11px] ${mine ? "text-white/75" : "text-zinc-500"}`}>
                    {m.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              );
            })}
          </div>
          <form action={postDealerDealMessageAction} className="mt-4 border-t border-zinc-200 pt-4">
            <input type="hidden" name="listingId" value={listingId} />
            <input type="hidden" name="buyerId" value={deal.buyerId} />
            <textarea
              name="message"
              rows={3}
              required
              placeholder="Write your message..."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="mt-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
              Send message
            </button>
          </form>
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

          {isSeller ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="text-sm font-semibold text-amber-950">Present agreed deal</p>
              <form action={presentDealerDealAction} className="mt-3 space-y-2">
                <input type="hidden" name="listingId" value={listingId} />
                <input type="hidden" name="buyerId" value={deal.buyerId} />
                <input
                  name="agreedTotal"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Agreed total (£)"
                  className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm"
                />
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
          ) : deal.agreedOffer ? (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <p className="text-sm font-semibold text-emerald-950">Deal ready for checkout</p>
              <p className="mt-1 text-sm text-emerald-900">
                Agreed total: £{((agreedBuyerGross ?? deal.agreedOffer.offeredPrice) / 100).toFixed(2)}
                {vatLabelSuffix(chargesVat)}
              </p>
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
