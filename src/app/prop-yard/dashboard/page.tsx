import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function PropYardUserDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/prop-yard/dashboard");

  const [setItemCount, myRequests, asYardOffers, me, sellerProfile, listings] = await Promise.all([
    prisma.propRentalSetItem.count({ where: { set: { userId: session.user.id } } }),
    prisma.propRentalBooking.findMany({
      where: { hirerId: session.user.id },
      include: { offer: { include: { listing: true } } },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    prisma.propRentalOffer.count({ where: { listing: { sellerId: session.user.id } } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } }),
    prisma.sellerProfile.findUnique({ where: { userId: session.user.id }, select: { id: true, displayName: true } }),
    prisma.listing.findMany({
      where: { sellerId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 60,
      include: { category: true, propRentalOffer: true },
    }),
  ]);

  const isYard = me?.role === "reclamation_yard";
  const isSellerOrYard = isYard || !!sellerProfile;

  return (
    <div>
      <h2 className="font-[family-name:var(--font-driven-display)] text-2xl font-semibold text-driven-ink">
        Prop Yard dashboard
      </h2>
      <p className="mt-2 text-sm text-driven-muted">
        Hire requests and set builder for productions; {isSellerOrYard ? "your marketplace listings and prop hire below." : "open a seller profile on the marketplace to list props."}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-driven-warm bg-white p-4">
          <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
            Items in your sets
          </p>
          <p className="mt-1 text-2xl font-semibold text-driven-ink">{setItemCount}</p>
          <Link
            href="/prop-yard/sets"
            className="mt-2 inline-block text-sm font-medium text-driven-accent underline hover:text-driven-ink"
          >
            My sets &amp; set builder
          </Link>
        </div>
        <div className="rounded-xl border border-driven-warm bg-white p-4">
          <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
            My requests
          </p>
          <p className="mt-1 text-2xl font-semibold text-driven-ink">{myRequests.length}</p>
          <Link
            href="/prop-yard/search"
            className="mt-2 inline-block text-sm font-medium text-driven-accent underline hover:text-driven-ink"
          >
            Find props
          </Link>
        </div>
        <div className="rounded-xl border border-driven-warm bg-white p-4">
          <p className="font-[family-name:var(--font-driven-mono)] text-[10px] uppercase tracking-wide text-driven-muted">
            Live prop offers
          </p>
          <p className="mt-1 text-2xl font-semibold text-driven-ink">{asYardOffers}</p>
          {isSellerOrYard ? (
            <Link
              href="/dashboard/prop-yard"
              className="mt-2 inline-block text-sm font-medium text-driven-accent underline hover:text-driven-ink"
            >
              Manage hire listings →
            </Link>
          ) : (
            <span className="mt-2 inline-block text-xs text-driven-muted">Seller profile required to offer hire.</span>
          )}
        </div>
      </div>

      {isSellerOrYard ? (
        <section className="mt-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-[family-name:var(--font-driven-display)] text-xl text-driven-ink">
                Your marketplace listings
              </h3>
              <p className="mt-1 text-sm text-driven-muted">
                {sellerProfile?.displayName ? `${sellerProfile.displayName} · ` : ""}
                Send a listing to The Prop Yard to set weekly hire, minimum weeks, and availability.
              </p>
            </div>
            {isYard ? (
              <Link
                href="/dashboard/prop-yard/wizard"
                className="inline-flex shrink-0 border border-driven-ink bg-driven-ink px-4 py-2 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
              >
                Add prop for hire
              </Link>
            ) : (
              <Link
                href="/dashboard/sell"
                className="inline-flex shrink-0 border border-driven-ink bg-driven-ink px-4 py-2 font-[family-name:var(--font-driven-mono)] text-xs uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
              >
                New listing
              </Link>
            )}
          </div>
          {isYard ? (
            <p className="text-xs text-driven-muted">
              Need a buy-now listing first?{" "}
              <Link href="/dashboard/sell" className="text-driven-accent underline hover:text-driven-ink">
                List on the marketplace
              </Link>{" "}
              — then use <strong className="text-driven-ink">Add prop for hire</strong> to attach hire pricing without
              duplicating the item.
            </p>
          ) : null}
          {listings.length === 0 ? (
            <p className="mt-6 text-sm text-driven-muted">No listings yet — create one on the marketplace first.</p>
          ) : (
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((l) => (
                <li
                  key={l.id}
                  className={`overflow-hidden rounded-xl border border-driven-warm shadow-sm ${
                    l.propRentalOffer ? "bg-driven-accent-light/30" : "bg-white"
                  }`}
                >
                  <div className="relative aspect-[4/3] bg-driven-warm">
                    {l.images[0] ? (
                      <Image
                        src={l.images[0]}
                        alt={l.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-driven-muted">
                        No image
                      </div>
                    )}
                    {l.propRentalOffer ? <div className="absolute inset-0 bg-white/45" /> : null}
                    <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                      {!l.visibleOnMarketplace ? (
                        <span className="rounded-full bg-driven-muted px-2 py-1 font-[family-name:var(--font-driven-mono)] text-[10px] font-semibold uppercase tracking-wide text-white">
                          Hire-only
                        </span>
                      ) : null}
                      {l.propRentalOffer ? (
                        <span className="rounded-full bg-driven-ink px-2 py-1 font-[family-name:var(--font-driven-mono)] text-[10px] font-semibold uppercase tracking-wide text-driven-paper">
                          In Prop Yard
                        </span>
                      ) : (
                        <Link
                          href={`/dashboard/prop-yard/wizard?listingId=${encodeURIComponent(l.id)}`}
                          className="rounded-full bg-driven-ink/90 px-2 py-1 font-[family-name:var(--font-driven-mono)] text-[10px] font-semibold uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
                        >
                          Send to Prop Yard
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="mb-2 flex flex-wrap gap-1">
                      <span className="rounded bg-driven-warm px-1.5 py-0.5 font-[family-name:var(--font-driven-mono)] text-[10px] font-semibold uppercase text-driven-ink">
                        {l.status}
                      </span>
                    </div>
                    <Link
                      href={`/listings/${l.id}`}
                      className="line-clamp-2 font-medium text-driven-ink hover:text-driven-accent hover:underline"
                    >
                      {l.title}
                    </Link>
                    <p className="mt-1 text-sm text-driven-muted">
                      {l.listingKind === "sell" && l.freeToCollector
                        ? `Free to collect · ${l.category.name}`
                        : l.listingKind === "auction"
                          ? `From £${(l.price / 100).toFixed(2)} · ${l.category.name}`
                          : `£${(l.price / 100).toFixed(2)} · ${l.category.name}`}
                    </p>
                    {l.propRentalOffer ? (
                      <div className="mt-2 rounded-lg border border-driven-warm bg-driven-paper px-2 py-1.5 font-[family-name:var(--font-driven-mono)] text-[11px] text-driven-ink">
                        Prop hire live · £{(l.propRentalOffer.weeklyHirePence / 100).toFixed(2)}/week · min{" "}
                        {l.propRentalOffer.minimumHireWeeks} week{l.propRentalOffer.minimumHireWeeks === 1 ? "" : "s"}.
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/listings/${l.id}/edit`}
                        className="rounded-lg border border-driven-warm bg-white px-3 py-1.5 text-center text-xs font-medium text-driven-ink hover:border-driven-ink"
                      >
                        Edit listing
                      </Link>
                      <Link
                        href={`/listings/${l.id}`}
                        className="rounded-lg border border-driven-warm bg-white px-3 py-1.5 text-center text-xs font-medium text-driven-ink hover:border-driven-ink"
                      >
                        View live
                      </Link>
                      {l.propRentalOffer ? (
                        <Link
                          href={`/prop-yard/offers/${l.propRentalOffer.id}`}
                          className="rounded-lg border border-driven-warm bg-white px-3 py-1.5 text-center text-xs font-medium text-driven-accent hover:border-driven-accent"
                        >
                          Prop hire page
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="mt-10 rounded-xl border border-driven-warm bg-white p-5">
        <h3 className="font-[family-name:var(--font-driven-mono)] text-[10px] font-semibold uppercase tracking-wide text-driven-muted">
          Recent hire requests
        </h3>
        {myRequests.length === 0 ? (
          <p className="mt-3 text-sm text-driven-muted">No hire requests sent yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-driven-warm">
            {myRequests.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <p className="font-medium text-driven-ink">{r.offer.listing.title}</p>
                <p className="text-driven-muted">
                  {r.hireStart.toLocaleDateString("en-GB")} → {r.hireEnd.toLocaleDateString("en-GB")} ·{" "}
                  {r.status.toLowerCase()} · £{(r.totalHirePence / 100).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
