import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default async function DashboardFavouritesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const rows = await prisma.listingFavorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          status: true,
          listingKind: true,
          price: true,
          freeToCollector: true,
          images: true,
          category: { select: { name: true, slug: true } },
        },
      },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Favourites</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Listings you saved from the marketplace. Open a listing to remove it from favourites using the heart
        button.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/search" className="font-medium text-brand hover:underline">
          Browse listings
        </Link>
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">
          You haven&apos;t saved any listings yet. Use &quot;Save&quot; on a listing page to add it here.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((row) => {
            const l = row.listing;
            const img = l.images[0] ?? null;
            const priceLabel =
              l.freeToCollector && l.listingKind === "sell"
                ? "Free to collect"
                : l.listingKind === "auction"
                  ? `From £${(l.price / 100).toFixed(2)}`
                  : `£${(l.price / 100).toFixed(2)}`;

            return (
              <li
                key={row.id}
                className="flex flex-wrap items-start gap-4 rounded-xl border border-zinc-200 bg-white p-4"
              >
                <Link
                  href={`/listings/${l.id}`}
                  className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-100"
                >
                  {img ? (
                    <Image src={img} alt="" fill className="object-cover" sizes="112px" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-zinc-400">No image</span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/listings/${l.id}`} className="font-medium text-zinc-900 hover:underline">
                    {l.title}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-600">
                    {l.category.name} · {priceLabel} · {l.status}
                    {l.listingKind === "auction" ? " · Auction" : ""}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Saved {row.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}
                  </p>
                </div>
                <Link
                  href={`/listings/${l.id}`}
                  className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  View
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
