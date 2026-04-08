import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OfferRespond } from "@/app/(marketing)/listings/[id]/OfferRespond";
import { SellerCounterOfferForm } from "@/app/(marketing)/listings/[id]/SellerCounterOfferForm";
import { BuyerCounterRespond } from "@/app/(marketing)/listings/[id]/BuyerCounterRespond";

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pending";
    case "accepted":
      return "Accepted";
    case "declined":
      return "Declined";
    case "withdrawn":
      return "Withdrawn";
    default:
      return status;
  }
}

export default async function OffersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [incoming, pendingSellerCounters, historyIncoming, outgoing] = await Promise.all([
    prisma.offer.findMany({
      where: {
        status: "pending",
        fromSellerCounter: false,
        listing: { sellerId: session.user.id },
      },
      include: {
        listing: true,
        buyer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.offer.findMany({
      where: {
        status: "pending",
        fromSellerCounter: true,
        listing: { sellerId: session.user.id },
      },
      include: {
        listing: true,
        buyer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.offer.findMany({
      where: {
        status: { in: ["declined", "accepted", "withdrawn"] },
        listing: { sellerId: session.user.id },
      },
      include: {
        listing: true,
        buyer: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 80,
    }),
    prisma.offer.findMany({
      where: { buyerId: session.user.id },
      include: { listing: true },
      orderBy: { updatedAt: "desc" },
      take: 60,
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Offers & haggling</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Accept a buyer’s offer to lock the price — they pay that amount from the listing page. From history you can
        send a counter-offer after a decline.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-zinc-900">Offers on your listings — action needed</h2>
        {incoming.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No pending buyer offers.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {incoming.map((o) => (
              <li key={o.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="font-medium text-zinc-900">{o.listing.title}</p>
                <p className="text-sm text-zinc-600">
                  £{(o.offeredPrice / 100).toFixed(2)} from {o.buyer.name ?? o.buyer.email ?? "Buyer"}
                </p>
                {o.message && <p className="mt-2 text-sm text-zinc-600">{o.message}</p>}
                <Link
                  href={`/listings/${o.listingId}`}
                  className="mt-2 inline-block text-sm text-brand hover:underline"
                >
                  View listing
                </Link>
                <OfferRespond offerId={o.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-zinc-900">History on your listings</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Declined, accepted, and withdrawn offers stay visible. Use counter-offer after a decline if the listing is
          still active.
        </p>
        {historyIncoming.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No past offers yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {historyIncoming.map((o) => (
              <li key={o.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900">{o.listing.title}</p>
                    <p className="text-sm text-zinc-600">
                      {o.fromSellerCounter ? (
                        <>
                          Your counter: £{(o.offeredPrice / 100).toFixed(2)} → {o.buyer.name ?? o.buyer.email}
                        </>
                      ) : (
                        <>
                          £{(o.offeredPrice / 100).toFixed(2)} from {o.buyer.name ?? o.buyer.email ?? "Buyer"}
                        </>
                      )}
                    </p>
                    {o.message ? <p className="mt-1 text-sm text-zinc-600">{o.message}</p> : null}
                    <p className="mt-2 text-xs text-zinc-500">
                      {statusLabel(o.status)}
                      {o.respondedAt
                        ? ` · ${o.respondedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`
                        : ""}
                    </p>
                  </div>
                  <Link
                    href={`/listings/${o.listingId}`}
                    className="shrink-0 text-sm text-brand hover:underline"
                  >
                    View listing
                  </Link>
                </div>
                {o.status === "declined" ? (
                  <SellerCounterOfferForm
                    declinedOfferId={o.id}
                    listingActive={
                      o.listing.status === "active" &&
                      o.listing.listingKind === "sell" &&
                      !o.listing.freeToCollector
                    }
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-zinc-900">Your offers (as buyer)</h2>
        {outgoing.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">You haven’t made any offers yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {outgoing.map((o) => (
              <li key={o.id} className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
                <Link href={`/listings/${o.listingId}`} className="font-medium text-brand hover:underline">
                  {o.listing.title}
                </Link>
                <p className="text-zinc-600">
                  {o.fromSellerCounter ? "Seller counter-offer: " : "Your offer: "}
                  £{(o.offeredPrice / 100).toFixed(2)} · {statusLabel(o.status)}
                </p>
                {o.status === "pending" && o.fromSellerCounter ? (
                  <BuyerCounterRespond offerId={o.id} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
