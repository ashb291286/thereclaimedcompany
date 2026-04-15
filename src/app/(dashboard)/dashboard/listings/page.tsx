import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  sellerBoostListingCheckoutAction,
  sellerDeleteOwnListingAction,
} from "@/lib/actions/seller-listings";

export default async function DashboardListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ boosted?: string; boostError?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { boosted, boostError } = await searchParams;
  const now = new Date();

  const listings = await prisma.listing.findMany({
    where: { sellerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 120,
    select: {
      id: true,
      title: true,
      status: true,
      visibleOnMarketplace: true,
      updatedAt: true,
      images: true,
      boostedUntil: true,
      listingKind: true,
      price: true,
      freeToCollector: true,
      category: { select: { name: true } },
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">My listings</h1>
        <Link
          href="/dashboard/sell"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          New listing
        </Link>
      </div>

      {boosted === "1" ? (
        <p className="mt-4 text-sm text-emerald-700">Listing boosted for 7 days.</p>
      ) : null}
      {boostError ? (
        <p className="mt-2 text-sm text-rose-700">
          Couldn&apos;t start boost checkout. Ensure listing is active and try again.
        </p>
      ) : null}

      {listings.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">You have not added any listings yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {listings.map((l) => {
            const img = l.images[0] ?? null;
            const priceLabel =
              l.listingKind === "sell" && l.freeToCollector
                ? "Free to collect"
                : l.listingKind === "auction"
                  ? `From £${(l.price / 100).toFixed(2)}`
                  : `£${(l.price / 100).toFixed(2)}`;
            const isBoosted = l.boostedUntil != null && l.boostedUntil > now;

            return (
              <li
                key={l.id}
                className="flex flex-wrap items-start gap-4 rounded-xl border border-zinc-200 bg-white p-4"
              >
                <Link
                  href={`/listings/${l.id}`}
                  className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-100"
                >
                  {img ? (
                    <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-zinc-400">No image</span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/listings/${l.id}`} className="font-medium text-zinc-900 hover:underline">
                    {l.title}
                  </Link>
                  <p className="text-sm text-zinc-600">
                    {l.category.name} · {priceLabel} · {l.status} ·{" "}
                    {l.visibleOnMarketplace ? "Visible" : "Hidden"}
                    {l.listingKind === "auction" ? " · Auction" : ""}
                  </p>
                  {isBoosted ? (
                    <p className="mt-1 text-xs font-medium text-amber-800">
                      Boosted until {l.boostedUntil!.toLocaleDateString("en-GB", { dateStyle: "medium" })}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-zinc-500">
                    Updated {l.updatedAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/listings/${l.id}`}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    View
                  </Link>
                  <Link
                    href={`/dashboard/listings/${l.id}/edit`}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    Edit
                  </Link>
                  <form action={sellerBoostListingCheckoutAction} className="contents">
                    <input type="hidden" name="listingId" value={l.id} />
                    <input type="hidden" name="boostReturn" value="listings" />
                    <button
                      type="submit"
                      disabled={l.status !== "active"}
                      className="rounded-lg border border-amber-200 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                      title={l.status === "active" ? "Boost for 7 days (£5)" : "Only active listings can be boosted"}
                    >
                      {isBoosted ? "Boosted" : "Boost £5"}
                    </button>
                  </form>
                  <form action={sellerDeleteOwnListingAction} className="contents">
                    <input type="hidden" name="listingId" value={l.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
