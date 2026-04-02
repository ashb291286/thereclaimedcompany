import Link from "next/link";
import { prisma } from "@/lib/db";
import { MOCK_AUCTION_LISTING_ID } from "@/app/driven/_lib/mock-auction";

export default async function DrivenAuctionsPage() {
  const rows = await prisma.drivenAuctionListing.findMany({
    where: { status: "ACTIVE" },
    orderBy: { endsAt: "asc" },
    include: {
      vehicle: { select: { year: true, make: true, model: true, registration: true, passportScore: true } },
    },
  });

  return (
    <div>
      <h1 className="font-[family-name:var(--font-driven-display)] text-3xl italic text-driven-ink">Active auctions</h1>
      <p className="mt-2 max-w-2xl text-sm text-driven-muted">
        This passport transfers to the next owner. Every document in the Reclaimed record is permanent.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li className="border border-driven-warm bg-white">
          <Link href={`/driven/auctions/${MOCK_AUCTION_LISTING_ID}`} className="block p-5">
            <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-accent">
              Sample
            </p>
            <p className="mt-2 font-[family-name:var(--font-driven-display)] text-lg text-driven-ink">1987 Porsche 911 Carrera</p>
            <p className="mt-1 text-xs text-driven-muted">Curated demo · full Reclaimed timeline</p>
          </Link>
        </li>
        {rows.map((a) => (
          <li key={a.id} className="border border-driven-warm bg-white">
            <Link href={`/driven/auctions/${a.id}`} className="block p-5 hover:bg-driven-accent-light/30">
              <p className="font-[family-name:var(--font-driven-display)] text-lg text-driven-ink">
                {a.vehicle.year} {a.vehicle.make} {a.vehicle.model}
              </p>
              <p className="mt-1 font-[family-name:var(--font-driven-mono)] text-xs text-driven-muted">
                {a.vehicle.registration} · passport {a.vehicle.passportScore}/100
              </p>
              <p className="mt-3 font-[family-name:var(--font-driven-mono)] text-sm">
                £{(a.currentBid / 100).toLocaleString("en-GB")} · {a.bidCount} bids
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
