import Link from "next/link";
import { prisma } from "@/lib/db";
import Image from "next/image";
import { HeroSearch } from "./HeroSearch";

export default async function HomePage() {
  const listings = await prisma.listing.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { category: true },
  });

  return (
    <div className="pb-12">
      <section className="relative overflow-hidden bg-zinc-900">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/50" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/90">
            Find your next piece
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
            Search every listing — or match a photo to similar stock
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-200 sm:text-lg">
            Hunt by keywords across all active listings, or upload a reference image to surface close visual matches — ideal for tiles, ironmongery, timber, and one-off salvage.
          </p>

          <HeroSearch />

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/auth/register"
              className="rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/25 hover:bg-amber-700"
            >
              Start selling
            </Link>
            <Link
              href="/search?sellerType=reclamation_yard"
              className="rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Find a yard
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-7xl px-4 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-zinc-900">Latest listings</h2>
          <Link href="/search" className="text-sm font-medium text-amber-700 hover:underline">
            View all
          </Link>
        </div>
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
          From reclaimed timbers to vintage fittings, explore the newest stock posted by our community.
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        {listings.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white p-6 text-zinc-500">
            No listings yet. Check back soon.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/listings/${l.id}`}
                  className="block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-amber-300"
                >
                  <div className="relative aspect-square bg-zinc-200">
                    {l.images[0] ? (
                      <Image
                        src={l.images[0]}
                        alt={l.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="mb-1 flex flex-wrap gap-1">
                      {l.listingKind === "auction" && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                          Auction
                        </span>
                      )}
                      {l.listingKind === "sell" && l.freeToCollector && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-900">
                          Free
                        </span>
                      )}
                    </div>
                    <p className="truncate font-medium text-zinc-900">{l.title}</p>
                    <p className="text-sm text-zinc-500">
                      {l.listingKind === "sell" && l.freeToCollector
                        ? `Free to collect · ${l.category.name}`
                        : l.listingKind === "auction"
                          ? `From £${(l.price / 100).toFixed(2)} · ${l.category.name}`
                          : `£${(l.price / 100).toFixed(2)} · ${l.category.name}`}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
