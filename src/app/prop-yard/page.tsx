import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE, PROP_YARD_TERMS_VERSION } from "@/lib/prop-yard";
import styles from "./marquee.module.css";

export default async function PropYardHomePage() {
  const pct = Math.round(PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE * 100);
  const testimonials = [
    {
      quote:
        "We built our hero props by yard in one place, then sent grouped requests in minutes instead of juggling six spreadsheets.",
      by: "Art Department Lead, TV Drama",
    },
    {
      quote:
        "Set Builder made scheduling sane - every line had dates, notes, and fulfillment before we contacted suppliers.",
      by: "Prop Buyer, Feature Film",
    },
    {
      quote:
        "We can now hire and return stock without hiding our sale inventory manually. The calendar and statuses do that work.",
      by: "Operations Manager, Reclamation Yard",
    },
    {
      quote:
        "The quality is better than generic prop houses because it is live reclaimed stock from real UK yards.",
      by: "Set Decorator, Commercial Studio",
    },
    {
      quote:
        "Our producers loved seeing request history by batch. It gave finance and production one clear source of truth.",
      by: "Production Coordinator, Factual Series",
    },
    {
      quote:
        "Weekly pricing and minimum periods are obvious up front, so fewer back-and-forth emails before confirming hires.",
      by: "Assistant Buyer, Independent Film",
    },
  ];

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
          For art departments, prop buyers, and productions: hire authentic reclaimed pieces from real UK yards — by the
          week, with dates and collection or delivery agreed directly with each supplier. Separate from buying on our
          marketplace, built for how shoots actually run.
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
            href="/prop-yard/sets"
            className="border border-driven-warm px-6 py-3 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-ink hover:border-driven-ink"
          >
            My sets
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-[family-name:var(--font-driven-display)] text-2xl italic text-driven-ink">
          Featured props for hire
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-driven-muted">
          Curated from live yard stock — not generic prop-house catalogues. Check weekly rates, minimum hire, and open
          the listing to add dates to your basket; each yard handles logistics and confirmation with you.
        </p>
        {featured.length === 0 ? (
          <div className="mt-8 border border-driven-warm bg-white p-8 text-center text-sm text-driven-muted">
            <p>No props available for hire yet — yards are still opting in. Try a search or check back soon.</p>
            <p className="mt-3 text-xs">
              Supplying a yard?{" "}
              <Link href="/prop-yard/dashboard" className="text-driven-accent underline">
                Prop dashboard
              </Link>
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {featured.map((o) => (
              <li key={o.id} className="overflow-hidden border border-driven-warm bg-white">
                <Link href={`/prop-yard/offers/${o.id}`} className="block hover:bg-driven-accent-light/40">
                  <div className="relative aspect-[4/3] bg-driven-warm/20">
                    {o.listing.images[0] ? (
                      <Image
                        src={o.listing.images[0]}
                        alt={o.listing.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wide text-driven-muted">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="font-[family-name:var(--font-driven-display)] text-xl text-driven-ink line-clamp-2">
                      {o.listing.title}
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-driven-mono)] text-xs uppercase text-driven-muted">
                      {o.listing.category.name} · from £{(o.weeklyHirePence / 100).toLocaleString("en-GB")}/week · min{" "}
                      {o.minimumHireWeeks} week{o.minimumHireWeeks === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12 border border-driven-warm bg-white px-6 py-8 sm:px-8">
        <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.35em] text-driven-accent">
          How It Works
        </p>
        <h2 className="mt-3 max-w-3xl font-[family-name:var(--font-driven-display)] text-3xl leading-tight text-driven-ink sm:text-4xl">
          From sourcing to confirmation in four steps.
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              step: "01",
              title: "Search stock",
              body: "Browse live props from real UK yards and open listings with weekly rates and minimum hire windows.",
            },
            {
              step: "02",
              title: "Build your set",
              body: "Add items to Set Builder with your dates, fulfillment notes, and production details.",
            },
            {
              step: "03",
              title: "Send grouped requests",
              body: "Submit one batch from your set and Prop Yard routes requests by supplier yard.",
            },
            {
              step: "04",
              title: "Confirm and pay",
              body: "Yards accept hire requests, you track status, then settle each hire through the platform.",
            },
          ].map((item) => (
            <article key={item.step} className="border border-driven-warm bg-driven-paper px-4 py-4">
              <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.2em] text-driven-accent">
                Step {item.step}
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-driven-display)] text-xl text-driven-ink">{item.title}</h3>
              <p className="mt-2 text-sm text-driven-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="hire-terms" className="mt-12 scroll-mt-24 grid gap-6 md:grid-cols-2">
        <div className="border border-driven-warm bg-white px-6 py-8">
          <h3 className="font-[family-name:var(--font-driven-display)] text-lg text-driven-ink">For productions</h3>
          <p className="mt-3 text-sm leading-relaxed text-driven-muted">
            Create a set, search props, add lines to your set, then send hire enquiries grouped by yard. Each request is a{" "}
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

      <section className="mt-12 border border-driven-warm bg-driven-ink px-6 py-8 text-driven-paper sm:px-8">
        <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.35em] text-driven-accent-light">
          Set Builder
        </p>
        <h2 className="mt-3 max-w-3xl font-[family-name:var(--font-driven-display)] text-3xl leading-tight sm:text-4xl">
          The only prop marketplace in the world built around set-based hire workflow.
        </h2>
        <p className="mt-4 max-w-3xl text-sm text-driven-paper/85 sm:text-base">
          Build sets by production. Add props with dates and notes. Send grouped requests per yard. Track every batch from
          request to paid hire.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/prop-yard/sets"
            className="border border-driven-paper bg-driven-paper px-5 py-2 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-ink hover:bg-driven-accent-light"
          >
            Open Set Builder
          </Link>
          <Link
            href="/prop-yard/search"
            className="border border-driven-paper/60 px-5 py-2 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-paper hover:border-driven-paper"
          >
            Browse Hire Stock
          </Link>
        </div>
      </section>

      <section className="relative left-1/2 mt-12 w-screen -translate-x-1/2 overflow-hidden border-y border-driven-warm bg-white py-6">
        <h2 className="px-6 font-[family-name:var(--font-driven-display)] text-2xl italic text-driven-ink sm:px-8">
          What productions and yards say
        </h2>
        <div className="mt-5 space-y-3">
          {[0, 1].map((rowIdx) => {
            const row = rowIdx === 0 ? testimonials : [...testimonials].reverse();
            const directionClass = rowIdx === 0 ? styles.marqueeLeft : styles.marqueeRight;
            return (
              <div key={rowIdx} className="relative overflow-hidden">
                <div className={`flex min-w-max gap-3 px-4 sm:px-6 ${directionClass}`}>
                  {[...row, ...row].map((t, i) => (
                    <article key={`${rowIdx}-${i}`} className="w-[320px] border border-driven-warm bg-driven-paper px-4 py-3">
                      <p className="text-sm text-driven-ink">{t.quote}</p>
                      <p className="mt-2 font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
                        {t.by}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="relative left-1/2 mt-12 w-screen -translate-x-1/2 border-y border-driven-warm bg-white px-6 py-8 sm:px-8">
        <div className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-3">
          <div>
            <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-[0.35em] text-driven-accent">
              The Prop Yard
            </p>
            <p className="mt-3 text-sm text-driven-muted">
              Hire reclaimed props from UK yards with set-based workflow for film, TV, theatre, and events.
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-ink">
              Explore
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <Link href="/prop-yard/search" className="block text-driven-muted hover:text-driven-ink">
                Browse props
              </Link>
              <Link href="/prop-yard/sets" className="block text-driven-muted hover:text-driven-ink">
                Set Builder
              </Link>
              <Link href="/prop-yard/dashboard" className="block text-driven-muted hover:text-driven-ink">
                Yard dashboard
              </Link>
            </div>
          </div>
          <div>
            <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-ink">
              Terms
            </p>
            <p className="mt-3 text-sm text-driven-muted">
              Hire requests use Prop Yard terms version <span className="text-driven-ink">{PROP_YARD_TERMS_VERSION}</span>.
            </p>
            <Link href="/prop-yard#hire-terms" className="mt-2 inline-block text-sm text-driven-accent underline">
              Read hire terms summary
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
