import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OfferRespond } from "@/app/(marketing)/listings/[id]/OfferRespond";

export default async function OffersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [incoming, outgoing] = await Promise.all([
    prisma.offer.findMany({
      where: {
        status: "pending",
        listing: { sellerId: session.user.id },
      },
      include: {
        listing: true,
        buyer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.offer.findMany({
      where: { buyerId: session.user.id },
      include: { listing: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Offers & haggling</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Accept an offer to lock the price — the buyer pays that amount from the listing page.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-zinc-900">Offers on your listings</h2>
        {incoming.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No pending offers.</p>
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
        <h2 className="text-lg font-medium text-zinc-900">Your offers</h2>
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
                  £{(o.offeredPrice / 100).toFixed(2)} · {o.status}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
