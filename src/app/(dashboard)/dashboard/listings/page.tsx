import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  sellerBoostListingCheckoutAction,
} from "@/lib/actions/seller-listings";
import { DeleteListingButton } from "./DeleteListingButton";

export default async function DashboardListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ boosted?: string; boostError?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { boosted, boostError, q: rawQ } = await searchParams;
  const now = new Date();
  const q = rawQ?.trim() ?? "";

  const listings = await prisma.listing.findMany({
    where: {
      sellerId: session.user.id,
      ...(q
        ? {
            OR: [
              { id: { contains: q } },
              { title: { contains: q, mode: "insensitive" } },
              { category: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
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
      _count: { select: { bids: true } },
    },
  });
  const listingIds = listings.map((l) => l.id);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [viewsTotal, views7d, favoritesTotal] = listingIds.length
    ? await Promise.all([
        prisma.listingViewEvent.groupBy({
          by: ["listingId"],
          where: { listingId: { in: listingIds } },
          _count: { _all: true },
        }),
        prisma.listingViewEvent.groupBy({
          by: ["listingId"],
          where: {
            listingId: { in: listingIds },
            createdAt: { gte: sevenDaysAgo },
          },
          _count: { _all: true },
        }),
        prisma.listingFavorite.groupBy({
          by: ["listingId"],
          where: { listingId: { in: listingIds } },
          _count: { _all: true },
        }),
      ])
    : [[], [], []];
  const viewsTotalByListing = new Map(viewsTotal.map((v) => [v.listingId, v._count._all]));
  const views7dByListing = new Map(views7d.map((v) => [v.listingId, v._count._all]));
  const favoritesByListing = new Map(favoritesTotal.map((v) => [v.listingId, v._count._all]));

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
      <form className="mt-4 flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title, ID, category, or status"
          className="w-full max-w-md rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50">
          Search
        </button>
        <Link href="/dashboard/listings" className="rounded border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-50">
          Clear
        </Link>
      </form>

      {listings.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">
          {q ? "No listings match your search." : "You have not added any listings yet."}
        </p>
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
            const canRelistNoBidAuction =
              l.listingKind === "auction" &&
              l.status === "ended" &&
              l._count.bids === 0;

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
                  <p className="mt-1 text-xs text-zinc-500">
                    {viewsTotalByListing.get(l.id) ?? 0} visits · {views7dByListing.get(l.id) ?? 0} in last 7d ·{" "}
                    {favoritesByListing.get(l.id) ?? 0} favourites
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
                  {canRelistNoBidAuction ? (
                    <Link
                      href={`/dashboard/listings/${l.id}/edit`}
                      className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-hover"
                    >
                      Relist
                    </Link>
                  ) : null}
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
                  <DeleteListingButton listingId={l.id} title={l.title} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
