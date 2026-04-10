import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  buyerGrossPenceFromSellerNetPence,
  sellerChargesVat,
  vatLabelSuffix,
} from "@/lib/vat-pricing";

export default async function MyBidsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=%2Fdashboard%2Fmy-bids");

  const mine = await prisma.bid.groupBy({
    by: ["listingId"],
    where: { bidderId: session.user.id },
    _max: { amountPence: true },
  });

  if (mine.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">My bids</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Live auctions you&apos;re bidding on and recent activity will show here. You&apos;ll get a notification
          if someone outbids you.
        </p>
        <Link href="/search?listingType=auction" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">
          Browse auctions →
        </Link>
      </div>
    );
  }

  const listingIds = mine.map((m) => m.listingId);
  const myMaxPence = new Map(mine.map((m) => [m.listingId, m._max.amountPence ?? 0]));

  const listings = await prisma.listing.findMany({
    where: { id: { in: listingIds }, listingKind: "auction" },
    include: {
      category: true,
      seller: { include: { sellerProfile: { select: { vatRegistered: true } } } },
    },
  });

  const allBids = await prisma.bid.findMany({
    where: { listingId: { in: listingIds } },
    select: { listingId: true, amountPence: true, bidderId: true },
  });

  const topByListing = new Map<string, { amountPence: number; bidderId: string }>();
  for (const b of allBids) {
    const cur = topByListing.get(b.listingId);
    if (!cur || b.amountPence > cur.amountPence) {
      topByListing.set(b.listingId, { amountPence: b.amountPence, bidderId: b.bidderId });
    }
  }

  const now = new Date();
  const rows = listings.map((l) => {
    const top = topByListing.get(l.id);
    const myNet = myMaxPence.get(l.id) ?? 0;
    const vat = sellerChargesVat({
      sellerRole: l.seller.role,
      vatRegistered: l.seller.sellerProfile?.vatRegistered,
    });
    const myGross = buyerGrossPenceFromSellerNetPence(myNet, vat);
    const highGross = top ? buyerGrossPenceFromSellerNetPence(top.amountPence, vat) : 0;
    const winning = top?.bidderId === session.user.id;
    const ended = l.auctionEndsAt ? l.auctionEndsAt <= now : true;
    const live = l.status === "active" && !ended;
    const awaitingPayment = l.status === "payment_pending" && winning;

    return {
      listing: l,
      myGrossPence: myGross,
      highGrossPence: highGross,
      winning,
      live,
      ended,
      awaitingPayment,
      vatSuffix: vatLabelSuffix(vat),
    };
  });

  rows.sort((a, b) => {
    if (a.live !== b.live) return a.live ? -1 : 1;
    const ae = a.listing.auctionEndsAt?.getTime() ?? 0;
    const be = b.listing.auctionEndsAt?.getTime() ?? 0;
    return be - ae;
  });

  const liveRows = rows.filter((r) => r.live || r.awaitingPayment);
  const pastRows = rows.filter((r) => !r.live && !r.awaitingPayment);

  function money(p: number, suffix: string) {
    return `£${(p / 100).toFixed(2)}${suffix}`;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">My bids</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Track live auctions you&apos;re in. If you&apos;re outbid, we notify you — check{" "}
        <Link href="/dashboard/notifications" className="font-medium text-brand hover:underline">
          Notifications
        </Link>{" "}
        too.
      </p>

      {liveRows.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Live &amp; awaiting payment</h2>
          <ul className="mt-4 space-y-4">
            {liveRows.map((r) => (
              <li
                key={r.listing.id}
                className={`rounded-xl border p-4 shadow-sm ${
                  r.winning ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/40"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/listings/${r.listing.id}`} className="font-semibold text-zinc-900 hover:underline">
                      {r.listing.title}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">{r.listing.category.name}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      r.awaitingPayment
                        ? "bg-amber-200 text-amber-950"
                        : r.winning
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-600 text-white"
                    }`}
                  >
                    {r.awaitingPayment
                      ? "You won — pay"
                      : r.winning
                        ? "Highest bid"
                        : "Outbid"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
                  <p>
                    Your bid:{" "}
                    <strong>{money(r.myGrossPence, r.vatSuffix)}</strong>
                  </p>
                  <p>
                    Current high:{" "}
                    <strong>{money(r.highGrossPence, r.vatSuffix)}</strong>
                  </p>
                </div>
                {r.listing.auctionEndsAt && r.live ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Ends {r.listing.auctionEndsAt.toLocaleString()}
                  </p>
                ) : null}
                <Link
                  href={`/listings/${r.listing.id}`}
                  className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
                >
                  {r.awaitingPayment ? "Complete payment →" : r.winning ? "View / raise bid →" : "Bid again →"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pastRows.length > 0 ? (
        <section className={liveRows.length > 0 ? "mt-10" : "mt-8"}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Past auctions</h2>
          <ul className="mt-4 space-y-3">
            {pastRows.map((r) => (
              <li key={r.listing.id} className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
                <Link href={`/listings/${r.listing.id}`} className="font-medium text-zinc-900 hover:underline">
                  {r.listing.title}
                </Link>
                <p className="mt-1 text-zinc-600">
                  Your bid {money(r.myGrossPence, r.vatSuffix)} · High {money(r.highGrossPence, r.vatSuffix)}
                  {" · "}
                  {r.listing.status === "sold" && r.winning
                    ? "Won — sold"
                    : r.listing.status === "payment_pending" && r.winning
                      ? "Won — pay on listing"
                      : r.listing.status === "ended" && r.winning
                        ? "Ended while you led (check reserve / outcome on listing)"
                        : r.winning
                          ? `Listing ${r.listing.status}`
                          : "Outbid or lower than winner"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
