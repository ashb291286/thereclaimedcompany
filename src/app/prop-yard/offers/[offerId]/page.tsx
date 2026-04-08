import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE, PROP_YARD_TERMS_VERSION } from "@/lib/prop-yard";
import { upsertPropSetItemAction } from "@/lib/actions/prop-yard";

type Props = {
  params: Promise<{ offerId: string }>;
  searchParams: Promise<{ error?: string; setId?: string }>;
};

export default async function PropYardOfferPage({ params, searchParams }: Props) {
  const { offerId } = await params;
  const { error, setId: setIdParam } = await searchParams;
  const session = await auth();

  const mySets =
    session?.user?.id != null
      ? await prisma.propRentalSet.findMany({
          where: { userId: session.user.id },
          orderBy: { updatedAt: "desc" },
          select: { id: true, name: true },
        })
      : [];

  const activeSetId = (setIdParam ?? "").trim();
  const activeSet = activeSetId ? mySets.find((s) => s.id === activeSetId) : undefined;

  const offer = await prisma.propRentalOffer.findFirst({
    where: {
      id: offerId,
      isActive: true,
      listing: { status: "active", listingKind: "sell", freeToCollector: false },
    },
    include: {
      listing: {
        include: {
          category: true,
          seller: { include: { sellerProfile: true } },
        },
      },
      bookings: {
        where: { status: { in: ["REQUESTED", "CONFIRMED", "OUT_ON_HIRE"] } },
        select: { id: true },
      },
      unavailability: {
        where: { endDate: { gte: new Date() } },
        select: { id: true },
      },
    },
  });
  if (!offer) notFound();

  const isOwner = session?.user?.id === offer.listing.sellerId;
  const pct = Math.round(PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE * 100);
  const listPrice = offer.listing.price;
  const suggested = Math.round(listPrice * PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE);

  return (
    <div>
      <nav className="text-sm text-driven-muted">
        <Link href="/prop-yard/search" className="hover:text-driven-ink">
          Find props
        </Link>
        <span className="mx-2">/</span>
        <span className="text-driven-ink">{offer.listing.title}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="relative aspect-square max-w-xl overflow-hidden rounded-2xl border border-driven-warm bg-driven-warm">
            {offer.listing.images[0] ? (
              <Image
                src={offer.listing.images[0]}
                alt={offer.listing.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : null}
          </div>
          {offer.listing.images.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {offer.listing.images.slice(1, 6).map((url) => (
                <div key={url} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-driven-warm bg-driven-warm">
                  <Image src={url} alt="" fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-8 max-w-none text-sm leading-relaxed text-driven-muted">
            <h2 className="font-[family-name:var(--font-driven-display)] text-lg text-driven-ink">Description</h2>
            <p className="mt-2 whitespace-pre-wrap">{offer.listing.description}</p>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-driven-warm bg-white p-6 shadow-sm">
            <p className="font-[family-name:var(--font-driven-mono)] text-[10px] font-semibold uppercase tracking-wide text-driven-muted">
              {offer.listing.category.name}
            </p>
            <h1 className="mt-2 text-xl font-semibold text-driven-ink">{offer.listing.title}</h1>
            <p className="mt-4 text-2xl font-semibold text-driven-ink">
              £{(offer.weeklyHirePence / 100).toFixed(2)}
              <span className="text-base font-normal text-driven-muted"> / week</span>
            </p>
            <p className="mt-2 text-xs text-driven-muted">
              Yard list price reference: £{(listPrice / 100).toFixed(2)} — typical suggestion was {pct}% (
              £{(suggested / 100).toFixed(2)}/wk); actual hire rate is as shown.
            </p>
            <p className="mt-1 text-xs text-driven-muted">
              Minimum hire period: {offer.minimumHireWeeks} week{offer.minimumHireWeeks === 1 ? "" : "s"}.
            </p>
            <p className="mt-1 text-xs text-driven-muted">
              Availability cues: {offer.bookings.length} active booking request
              {offer.bookings.length === 1 ? "" : "s"} · {offer.unavailability.length} blackout period
              {offer.unavailability.length === 1 ? "" : "s"} on file.
            </p>
            {offer.yardHireNotes ? (
              <div className="mt-4 rounded-lg bg-driven-accent-light/50 px-3 py-2 text-sm text-driven-ink">
                <p className="font-[family-name:var(--font-driven-mono)] text-[10px] font-semibold uppercase text-driven-muted">
                  From the yard
                </p>
                <p className="mt-1 whitespace-pre-wrap">{offer.yardHireNotes}</p>
              </div>
            ) : null}
            {offer.listing.seller.sellerProfile ? (
              <p className="mt-4 text-sm text-driven-muted">
                Supplied by{" "}
                <strong className="text-driven-ink">{offer.listing.seller.sellerProfile.displayName}</strong>
                {offer.listing.postcode ? ` · ${offer.listing.postcode}` : ""}
              </p>
            ) : null}
            {offer.listing.visibleOnMarketplace ? (
              <Link
                href={`/listings/${offer.listing.id}`}
                className="mt-3 inline-block text-sm font-medium text-driven-accent underline hover:text-driven-ink"
              >
                View marketplace listing (purchase separately)
              </Link>
            ) : (
              <p className="mt-3 text-xs text-driven-muted">
                This prop is <strong>hire-only</strong> — not listed for sale on the marketplace.
              </p>
            )}
          </div>

          {!isOwner ? (
            <div className="rounded-2xl border border-driven-warm bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-driven-ink">Add to your set</h2>
              <p className="mt-2 text-xs text-driven-muted">
                Choose which set you are building (or create one first). You&apos;ll confirm hire terms when you send
                requests from the set builder — requests still group by yard automatically.
              </p>
              {error ? (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {decodeURIComponent(error)}
                </p>
              ) : null}
              {session?.user?.id ? (
                mySets.length === 0 ? (
                  <p className="mt-4 text-sm text-driven-muted">
                    <Link href="/prop-yard/sets" className="font-medium text-driven-accent underline hover:text-driven-ink">
                      Create a set
                    </Link>{" "}
                    before adding props — e.g. one set per scene or production.
                  </p>
                ) : !activeSet ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-driven-ink">Select a set to add this prop to:</p>
                    <ul className="space-y-1.5">
                      {mySets.map((s) => (
                        <li key={s.id}>
                          <Link
                            href={`/prop-yard/offers/${offer.id}?setId=${encodeURIComponent(s.id)}`}
                            className="block rounded-lg border border-driven-warm px-3 py-2 text-sm text-driven-ink hover:border-driven-ink hover:bg-driven-accent-light/30"
                          >
                            {s.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link href="/prop-yard/sets" className="mt-2 inline-block text-xs text-driven-accent underline">
                      Manage sets →
                    </Link>
                  </div>
                ) : (
                  <>
                    <p className="mt-3 text-xs text-driven-muted">
                      Adding to: <strong className="text-driven-ink">{activeSet.name}</strong> ·{" "}
                      <Link href="/prop-yard/sets" className="text-driven-accent underline">
                        Change
                      </Link>
                    </p>
                    <form action={upsertPropSetItemAction} className="mt-4 space-y-4">
                      <input type="hidden" name="offerId" value={offer.id} />
                      <input type="hidden" name="setId" value={activeSet.id} />
                      <input
                        type="hidden"
                        name="returnTo"
                        value={`/prop-yard/set/${activeSet.id}`}
                      />
                      <div>
                        <label className="block text-xs font-medium text-driven-ink">Hire start</label>
                        <input
                          type="date"
                          name="hireStart"
                          required
                          className="mt-1 w-full rounded-lg border border-driven-warm px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-driven-ink">Hire end (inclusive)</label>
                        <input
                          type="date"
                          name="hireEnd"
                          required
                          className="mt-1 w-full rounded-lg border border-driven-warm px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-driven-ink">Fulfillment</label>
                        <select
                          name="fulfillment"
                          required
                          className="mt-1 w-full rounded-lg border border-driven-warm px-3 py-2 text-sm"
                        >
                          <option value="COLLECT_AND_RETURN">We collect from yard and return after shoot</option>
                          <option value="YARD_DELIVERS_AND_COLLECTS">Yard delivers and collects</option>
                          <option value="ARRANGE_SEPARATELY">Arrange separately (note below)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-driven-ink">Production / company name</label>
                        <input
                          name="hirerOrgName"
                          required
                          placeholder="e.g. Northlight Pictures Ltd"
                          className="mt-1 w-full rounded-lg border border-driven-warm px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-driven-ink">Production notes (optional)</label>
                        <textarea
                          name="productionNotes"
                          rows={3}
                          className="mt-1 w-full rounded-lg border border-driven-warm px-3 py-2 text-sm"
                          placeholder="Unit, location, special handling…"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-driven-ink">
                          Delivery &amp; return notes (optional)
                        </label>
                        <textarea
                          name="deliveryArrangementNotes"
                          rows={2}
                          className="mt-1 w-full rounded-lg border border-driven-warm px-3 py-2 text-sm"
                        />
                      </div>
                      <p className="text-[11px] text-driven-muted">
                        Hire terms (v{PROP_YARD_TERMS_VERSION}) are confirmed when you send requests from the set
                        builder.
                      </p>
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-driven-ink bg-driven-ink py-3 font-[family-name:var(--font-driven-mono)] text-xs font-semibold uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
                      >
                        Add to set
                      </button>
                    </form>
                    <p className="mt-3 text-xs text-driven-muted">
                      <Link
                        href={`/prop-yard/set/${activeSet.id}`}
                        className="font-medium text-driven-accent underline hover:text-driven-ink"
                      >
                        Open set builder
                      </Link>
                    </p>
                  </>
                )
              ) : (
                <p className="mt-4 text-sm text-driven-muted">
                  <Link
                    href={`/auth/signin?callbackUrl=${encodeURIComponent(`/prop-yard/offers/${offer.id}${activeSetId ? `?setId=${activeSetId}` : ""}`)}`}
                    className="font-medium text-driven-accent underline hover:text-driven-ink"
                  >
                    Sign in
                  </Link>{" "}
                  to build a set and request hires.
                </p>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-driven-warm bg-driven-accent-light/40 px-4 py-3 text-sm text-driven-ink">
              This is your offering. Manage it from the{" "}
              <Link href="/dashboard/prop-yard" className="font-medium text-driven-accent underline hover:text-driven-ink">
                manage hire listings
              </Link>{" "}
              area.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
