import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";

type Props = { searchParams: Promise<{ q?: string; error?: string }> };

export default async function PropYardSearchPage({ searchParams }: Props) {
  const { q, error } = await searchParams;
  const term = (q ?? "").trim();

  const offers = await prisma.propRentalOffer.findMany({
    where: {
      isActive: true,
      listing: {
        status: "active",
        listingKind: "sell",
        freeToCollector: false,
        ...(term
          ? {
              OR: [
                { title: { contains: term, mode: "insensitive" } },
                { description: { contains: term, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 48,
    include: {
      listing: {
        include: {
          category: true,
          seller: { include: { sellerProfile: true } },
        },
      },
    },
  });

  return (
    <div>
      <h2 className="text-2xl font-semibold text-amber-950">Find props</h2>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Listed by UK reclamation yards for weekly hire. Results are separate from marketplace purchase listings.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(error)}</p>
      ) : null}

      <form className="mt-6 flex flex-wrap gap-2" action="/prop-yard/search" method="get">
        <input
          type="search"
          name="q"
          defaultValue={term}
          placeholder="Search title or description…"
          className="min-w-[12rem] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-950"
        >
          Search
        </button>
      </form>

      {offers.length === 0 ? (
        <p className="mt-10 text-center text-sm text-zinc-600">
          No props match{term ? " that search" : ""} yet. Try another keyword or check back as yards opt in.
        </p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((o) => {
            const img = o.listing.images[0];
            const yard = o.listing.seller.sellerProfile;
            return (
              <li
                key={o.id}
                className="overflow-hidden rounded-xl border border-amber-900/10 bg-white shadow-sm"
              >
                <Link href={`/prop-yard/offers/${o.id}`} className="block">
                  <div className="relative aspect-[4/3] bg-zinc-100">
                    {img ? (
                      <Image src={img} alt="" fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-400">No image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-900/70">
                      {o.listing.category.name}
                    </p>
                    <h3 className="mt-1 line-clamp-2 font-semibold text-zinc-900">{o.listing.title}</h3>
                    <p className="mt-2 text-sm font-medium text-amber-950">
                      £{(o.weeklyHirePence / 100).toFixed(2)} / week
                    </p>
                    {yard ? (
                      <p className="mt-1 text-xs text-zinc-500">{yard.displayName}</p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
