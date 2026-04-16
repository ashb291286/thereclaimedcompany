import Link from "next/link";
import { prisma } from "@/lib/db";
import Image from "next/image";
import { HeroSearch } from "./HeroSearch";
import { TestimonialMarqueeFeed } from "./TestimonialMarqueeFeed";
import { parseStoredCarbonImpact } from "@/lib/carbon/listing";
import { CarbonBadge } from "@/components/CarbonBadge";
import { BrowseListingPriceLine } from "@/components/currency/BrowseListingPriceLine";
import { formatUkLocationLine } from "@/lib/postcode-uk";

function auctionCountdownLabel(endsAt: Date | null): string | null {
  if (!endsAt) return null;
  const ms = endsAt.getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days >= 1) return `${days}d ${hours}h left`;
  if (hours >= 1) return `${hours}h ${minutes}m left`;
  return `${Math.max(1, minutes)}m left`;
}

export default async function HomePage() {
  const [listings, demolitionAlerts, blogPosts] = await Promise.all([
    prisma.listing.findMany({
      where: { status: "active", visibleOnMarketplace: true },
      orderBy: [{ boostedUntil: "desc" }, { createdAt: "desc" }],
      take: 12,
      include: { category: true },
    }),
    prisma.demolitionProject.findMany({
      where: { status: "active" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      include: {
        elements: { select: { id: true, status: true, isFree: true } },
      },
    }),
    prisma.blogPost.findMany({
      where: { published: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: { id: true, title: true, slug: true, excerpt: true, publishedAt: true, createdAt: true },
    }),
  ]);

  return (
    <div>
      <section className="relative min-h-[320px] overflow-hidden bg-zinc-900 sm:min-h-[380px]">
        <Image
          src="/images/hero-home.png"
          alt="Weathered reclaimed timber planks"
          fill
          className="object-cover object-[center_40%] sm:object-center"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/55 to-black/40" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-200/90">
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
              className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/25 hover:bg-brand-hover"
            >
              Start selling
            </Link>
            <Link
              href="/reclamation-yards"
              className="rounded-full border border-white/70 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Find a yard
            </Link>
          </div>
        </div>
      </section>

      <Link
        href="/driven"
        className="group flex border-y border-driven-warm bg-driven-paper transition-colors hover:bg-driven-accent-light/60"
      >
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-driven-accent">The Reclaimed Company</p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-driven-ink sm:text-xl">
              Driven · <span className="italic font-normal text-driven-muted">Reclaimed</span>
            </p>
            <p className="mt-1 max-w-xl text-sm text-driven-muted">
              Unique and Classic Cars, Provenance and Curated Auctions - Every car has a story.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-driven-ink bg-driven-ink px-5 py-2.5 text-sm font-semibold text-driven-paper group-hover:bg-driven-accent group-hover:border-driven-accent">
            Open Driven
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </span>
        </div>
      </Link>

      <section className="mx-auto mt-10 w-full max-w-7xl px-4 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-zinc-900">Latest listings</h2>
          <Link href="/search" className="text-sm font-medium text-brand hover:underline">
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
            {listings.map((l) => {
              const impact = parseStoredCarbonImpact(l);
              const auctionCountdown = l.listingKind === "auction" ? auctionCountdownLabel(l.auctionEndsAt) : null;
              return (
              <li key={l.id}>
                <Link
                  href={`/listings/${l.id}`}
                  className="block overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-brand/40"
                >
                  <div className="relative aspect-square bg-zinc-200">
                    {auctionCountdown ? (
                      <span className="absolute right-2 top-2 z-10 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                        {auctionCountdown}
                      </span>
                    ) : null}
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
                    <div className="mb-1 flex min-h-[18px] flex-wrap content-start items-start gap-1">
                      {l.listingKind === "auction" && (
                        <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">
                          Auction
                        </span>
                      )}
                      {l.listingKind === "sell" && l.freeToCollector && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-900">
                          Free
                        </span>
                      )}
                      {l.offersDelivery && (
                        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-900">
                          Delivers
                        </span>
                      )}
                    </div>
                    <p className="truncate font-medium text-zinc-900">{l.title}</p>
                    <BrowseListingPriceLine
                      listingKind={l.listingKind}
                      freeToCollector={l.freeToCollector}
                      buyerPenceGbp={l.price}
                      vatSuffix=""
                      categoryName={l.category.name}
                    />
                    <p className="mt-1 truncate font-mono text-[10px] text-zinc-400">ID: {l.id}</p>
                    {impact ? (
                      <div className="mt-2">
                        <CarbonBadge impact={impact} variant="compact" />
                      </div>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
            })}
          </ul>
        )}
      </div>

      <section className="mx-auto mt-10 w-full max-w-7xl px-4 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-zinc-900">From the blog</h2>
          <Link href="/blog" className="text-sm font-medium text-brand hover:underline">
            View all posts
          </Link>
        </div>
        {blogPosts.length === 0 ? null : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {blogPosts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="block h-full rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-brand/40"
                >
                  <p className="font-semibold text-zinc-900">{p.title}</p>
                  {p.excerpt ? <p className="mt-2 line-clamp-3 text-sm text-zinc-600">{p.excerpt}</p> : null}
                  <p className="mt-3 text-xs text-zinc-500">{(p.publishedAt ?? p.createdAt).toISOString().slice(0, 10)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 border-y border-amber-900/15 bg-gradient-to-br from-amber-50 via-white to-orange-50/80">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-900/80">Before it hits the skip</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Demolition &amp; refurb alerts
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-700 sm:text-base">
            Whole-building strip-outs and refurbs listed as one project with multiple lots — doors, glazing, flooring,
            furniture, and more. <strong className="font-semibold text-zinc-900">Free</strong> lots can be reserved
            with collection windows and conditions; <strong className="font-semibold text-zinc-900">chargeable</strong>{" "}
            lots show a guide price and collect interest from buyers and reclamation yards.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/demolition-alerts"
              className="rounded-full bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-950"
            >
              Browse alerts
            </Link>
            <Link
              href="/dashboard/demolition-alerts/new"
              className="rounded-full border border-amber-900/40 bg-white px-5 py-2.5 text-sm font-semibold text-amber-950 hover:bg-amber-50"
            >
              Post a project
            </Link>
          </div>

          {demolitionAlerts.length > 0 ? (
            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              {demolitionAlerts.map((d) => {
                const open = d.elements.filter((e) => e.status === "available").length;
                return (
                  <li key={d.id}>
                    <Link
                      href={`/demolition-alerts/${d.id}`}
                      className="block h-full rounded-xl border border-amber-900/20 bg-white/90 p-4 shadow-sm transition hover:border-amber-900/40 hover:shadow"
                    >
                      <p className="line-clamp-2 font-semibold text-zinc-900">{d.title}</p>
                      <p className="mt-2 text-xs text-zinc-600">
                        {formatUkLocationLine({
                          postcodeLocality: d.postcodeLocality,
                          adminDistrict: d.adminDistrict,
                          region: d.region,
                          postcode: d.postcode,
                        })}
                      </p>
                      <p className="mt-2 text-xs font-medium text-amber-900">
                        {d.elements.length} lot{d.elements.length === 1 ? "" : "s"}
                        {open > 0 ? ` · ${open} open` : ""}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-zinc-600">
              No live alerts yet — be the first to list a site and its salvage lots.
            </p>
          )}
        </div>
      </section>

      <TestimonialMarqueeFeed />
    </div>
  );
}
