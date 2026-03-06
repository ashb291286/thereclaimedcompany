import Link from "next/link";
import { prisma } from "@/lib/db";
import Image from "next/image";

export default async function HomePage() {
  const listings = await prisma.listing.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { category: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">
        Reclaimed materials & architectural salvage
      </h1>
      <p className="mt-1 text-zinc-600">
        Find local reclamation yards and buy from individuals.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/search?sellerType=reclamation_yard"
          className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200"
        >
          Reclamation yards near me
        </Link>
        <Link
          href="/search"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Browse all
        </Link>
      </div>
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-zinc-900">Recent listings</h2>
          <Link href="/search" className="text-sm text-amber-600 hover:underline">
            View all
          </Link>
        </div>
        {listings.length === 0 ? (
          <p className="text-zinc-500">No listings yet. Check back soon.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {listings.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/listings/${l.id}`}
                  className="block rounded-xl border border-zinc-200 bg-white overflow-hidden hover:border-amber-300 transition-colors"
                >
                  <div className="aspect-square relative bg-zinc-200">
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
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-zinc-900 truncate">{l.title}</p>
                    <p className="text-sm text-zinc-500">
                      £{(l.price / 100).toFixed(2)} · {l.category.name}
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
