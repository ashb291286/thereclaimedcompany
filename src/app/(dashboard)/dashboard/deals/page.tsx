import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DealerDealsIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const deals = await prisma.dealerDeal.findMany({
    where: {
      OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }],
    },
    include: {
      listing: { select: { id: true, title: true } },
      buyer: { select: { id: true, email: true, name: true } },
      seller: { select: { id: true, email: true, name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 80,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Private deals</h1>
      <p className="mt-1 text-sm text-zinc-600">
        One private thread per buyer and dealer listing. Negotiate, present an agreed deal, then complete checkout.
      </p>
      {deals.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600">No deal discussions yet.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {deals.map((deal) => {
            const counterparty =
              deal.buyerId === session.user.id
                ? deal.seller.name ?? deal.seller.email ?? "Dealer"
                : deal.buyer.name ?? deal.buyer.email ?? "Buyer";
            return (
              <li key={deal.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <Link href={`/dashboard/deals/${deal.listingId}?buyer=${deal.buyerId}`} className="font-medium text-zinc-900 hover:underline">
                  {deal.listing.title}
                </Link>
                <p className="mt-1 text-xs text-zinc-500">
                  With {counterparty} · {deal.status} · {deal.updatedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                {deal.messages[0] ? (
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-700">{deal.messages[0].body}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
