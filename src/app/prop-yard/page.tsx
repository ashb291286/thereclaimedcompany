import Link from "next/link";
import { prisma } from "@/lib/db";
import { PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE, PROP_YARD_TERMS_VERSION } from "@/lib/prop-yard";

export default async function PropYardHomePage() {
  const pct = Math.round(PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE * 100);

  const featured = await prisma.propRentalOffer.findMany({
    where: { isActive: true, listing: { status: "active" } },
    orderBy: { updatedAt: "desc" },
    take: 4,
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
          listingKind: true,
          freeToCollector: true,
          category: { select: { name: true } },
        },
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
          The Prop Yard
        </h1>
        <p className="mt-6 max-w-xl font-[family-name:var(--font-driven-body)] text-lg text-driven-muted">
          Business-to-business hire of yard stock for film and TV — layered on your marketplace listings, not a second
          shopfront.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/prop-yard/search"
            className="border border-driven-ink bg-driven-ink px-6 py-3 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
          >
            Search the Prop Yard
          </Link>
          <Link
            href="/prop-yard/dashboard"
            className="border border-driven-warm px-6 py-3 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-ink hover:border-driven-ink"
          >
            Prop dashboard
          </Link>
          <Link
            href="/prop-yard/basket"
            className="border border-driven-warm px-6 py-3 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-ink hover:border-driven-ink"
          >
            Request basket
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-driven-display)] text-2xl italic text-driven-ink">
          Featured props for hire
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-driven-muted">
          Drawn from real reclamation-yard inventory. Hire is separate from buying on the main marketplace — weekly
          rates, dates, and logistics agreed with each yard.
        </p>
        {featured.length === 0 ? (
          <div className="mt-8 border border-driven-warm bg-white p-8 text-center text-sm text-driven-muted">
            <p>No active prop listings yet.</p>
            <p className="mt-3">
              <Link href="/prop-yard/dashboard" className="text-driven-accent underline">
                Open the prop dashboard
              </Link>{" "}
              to list from your marketplace inventory.
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {featured.map((o) => (
              <li key={o.id} className="border border-driven-warm bg-white">
                <Link href={`/prop-yard/offers/${o.id}`} className="block p-5 hover:bg-driven-accent-light/40">
                  <p className="font-[family-name:var(--font-driven-display)] text-xl text-driven-ink line-clamp-2">
                    {o.listing.title}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-driven-mono)] text-xs uppercase text-driven-muted">
                    {o.listing.category.name} · from £{(o.weeklyHirePence / 100).toLocaleString("en-GB")}/week · min{" "}
                    {o.minimumHireWeeks} week{o.minimumHireWeeks === 1 ? "" : "s"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="border border-driven-warm bg-white px-6 py-8">
          <h3 className="font-[family-name:var(--font-driven-display)] text-lg text-driven-ink">For productions</h3>
          <p className="mt-3 text-sm leading-relaxed text-driven-muted">
            Search props, add them to a request basket, and send hire enquiries grouped by yard. Each request is a{" "}
            <strong className="text-driven-ink">rental</strong> with agreed dates, fulfillment (collection / delivery /
            return), and acceptance of hire terms (v{PROP_YARD_TERMS_VERSION}) — separate from the sale marketplace.
          </p>
        </div>
        <div className="border border-driven-warm bg-white px-6 py-8">
          <h3 className="font-[family-name:var(--font-driven-display)] text-lg text-driven-ink">
            For yards &amp; sellers
          </h3>
          <p className="mt-3 text-sm text-driven-muted">
            Opt in listings you already sell on Reclaimed. Set a <strong className="text-driven-ink">weekly hire rate</strong>{" "}
            — we suggest <strong className="text-driven-ink">{pct}% of your marketed list price per week</strong> as a
            starting point. Manage availability and blackout dates from manage hire listings or your main dashboard.
          </p>
          <Link
            href="/prop-yard/dashboard"
            className="mt-4 inline-block font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-accent underline hover:text-driven-ink"
          >
            Prop dashboard →
          </Link>
        </div>
      </section>
    </div>
  );
}
