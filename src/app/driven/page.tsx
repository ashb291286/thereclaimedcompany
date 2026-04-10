import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  MOCK_AUCTION_LISTING_ID,
  MOCK_DRIVEN_VEHICLE_IMAGE_URL,
} from "@/app/driven/_lib/mock-auction";

export default async function DrivenHomePage() {
  const featured = await prisma.drivenAuctionListing.findMany({
    where: { status: "ACTIVE" },
    orderBy: { endsAt: "asc" },
    take: 4,
    include: {
      vehicle: {
        select: { id: true, year: true, make: true, model: true, registration: true, imageUrls: true },
      },
    },
  });

  return (
    <div>
      <section className="border border-driven-warm bg-white px-6 py-12 sm:px-10 sm:py-16">
        <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.35em] text-driven-accent">
          The Reclaimed Company
        </p>
        <h1 className="mt-4 max-w-2xl font-[family-name:var(--font-driven-display)] text-4xl font-semibold leading-tight sm:text-5xl">
          Driven · <span className="italic">Reclaimed</span>
        </h1>
        <p className="mt-6 max-w-xl font-[family-name:var(--font-driven-body)] text-lg text-driven-muted">
          Every car has a story. This is where it lives.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/driven/auctions"
            className="border border-driven-ink bg-driven-ink px-6 py-3 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
          >
            View auctions
          </Link>
          <Link
            href={`/driven/auctions/${MOCK_AUCTION_LISTING_ID}`}
            className="border border-driven-warm px-6 py-3 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-ink hover:border-driven-ink"
          >
            See sample listing
          </Link>
          <Link
            href="/driven/garage"
            className="border border-driven-warm px-6 py-3 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-ink hover:border-driven-ink"
          >
            Your garage
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-driven-display)] text-2xl italic text-driven-ink">Featured auctions</h2>
        <p className="mt-2 max-w-2xl text-sm text-driven-muted">
          Reserve set by the seller, not by us. Title held in escrow until transfer confirmed. Independent inspection — not
          seller-written.
        </p>
        {featured.length === 0 ? (
          <div className="mt-8 overflow-hidden border border-driven-warm bg-white">
            <Link href={`/driven/auctions/${MOCK_AUCTION_LISTING_ID}`} className="block hover:bg-driven-accent-light/30">
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-driven-warm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={MOCK_DRIVEN_VEHICLE_IMAGE_URL}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-8 text-center text-sm text-driven-muted">
                <p>No live auctions yet.</p>
                <p className="mt-4 font-[family-name:var(--font-driven-mono)] text-driven-accent underline">
                  Open the curated sample listing
                </p>
              </div>
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {featured.map((a) => {
              const thumb = a.vehicle.imageUrls[0];
              return (
                <li key={a.id} className="border border-driven-warm bg-white">
                  <Link href={`/driven/auctions/${a.id}`} className="block overflow-hidden hover:bg-driven-accent-light/40">
                    {thumb ? (
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-driven-warm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex aspect-[16/9] w-full items-center justify-center bg-driven-warm font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wider text-driven-muted">
                        No photo
                      </div>
                    )}
                    <div className="p-5">
                      <p className="font-[family-name:var(--font-driven-display)] text-xl text-driven-ink">
                        {a.vehicle.year} {a.vehicle.make} {a.vehicle.model}
                      </p>
                      <p className="mt-1 font-[family-name:var(--font-driven-mono)] text-xs uppercase text-driven-muted">
                        {a.vehicle.registration} · ends {a.endsAt.toLocaleDateString("en-GB")}
                      </p>
                      <p className="mt-3 font-[family-name:var(--font-driven-mono)] text-sm text-driven-ink">
                        Current bid £{(a.currentBid / 100).toLocaleString("en-GB")}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
