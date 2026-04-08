import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  removePropSetItemAction,
  submitPropSetRequestsAction,
  updatePropRentalSetHireWindowAction,
  updatePropRentalSetNameAction,
} from "@/lib/actions/prop-yard";
import {
  billableWeeksFromRange,
  computePropHireTotalPence,
  PROP_YARD_TERMS_VERSION,
  utcCalendarDateToIso,
} from "@/lib/prop-yard";

type Props = { params: Promise<{ setId: string }>; searchParams: Promise<{ error?: string }> };

export default async function PropYardSetBuilderPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/prop-yard/sets");
  const { setId } = await params;
  const { error } = await searchParams;

  const [set, batchBookings] = await Promise.all([
    prisma.propRentalSet.findFirst({
      where: { id: setId, userId: session.user.id },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: {
            offer: {
              include: { listing: { include: { seller: { include: { sellerProfile: true } } } } },
            },
          },
        },
      },
    }),
    prisma.propRentalBooking.findMany({
      where: {
        propRentalSetId: setId,
        hirerId: session.user.id,
        hireRequestBatchId: { not: null },
      },
      include: {
        offer: {
          include: { listing: { include: { seller: { include: { sellerProfile: true } } } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  if (!set) notFound();

  const batchMap = new Map<
    string,
    { batchId: string; createdAt: Date; rows: typeof batchBookings }
  >();
  for (const b of batchBookings) {
    const bid = b.hireRequestBatchId!;
    if (!batchMap.has(bid)) {
      batchMap.set(bid, { batchId: bid, createdAt: b.createdAt, rows: [] });
    }
    batchMap.get(bid)!.rows.push(b);
  }
  const batchesOrdered = [...batchMap.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  const groupedYards = new Set(set.items.map((x) => x.offer.listing.sellerId)).size;

  let runningPence = 0;
  const itemRows = set.items.map((item) => {
    const billableWeeks = billableWeeksFromRange(item.hireStart, item.hireEnd);
    const linePence = computePropHireTotalPence(
      item.hireStart,
      item.hireEnd,
      item.offer.minimumHireWeeks,
      item.offer.weeklyHirePence
    );
    runningPence += linePence;
    return { item, billableWeeks, linePence, runningPence };
  });
  const totalIndicative = runningPence;

  return (
    <div>
      <nav className="text-sm text-driven-muted">
        <Link href="/prop-yard/sets" className="hover:text-driven-ink">
          Your sets
        </Link>
        <span className="mx-2">/</span>
        <span className="text-driven-ink">Set builder</span>
      </nav>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-driven-display)] text-2xl font-semibold text-driven-ink">
            {set.name}
          </h1>
          <p className="mt-1 text-sm text-driven-muted">
            Add props from search, then send hire requests. Your lines stay in the set after sending so you can track
            what you submitted and pay each yard through the platform.
            {set.defaultHireStart && set.defaultHireEnd ? (
              <>
                {" "}
                Default hire window for new lines:{" "}
                <span className="text-driven-ink">
                  {set.defaultHireStart.toLocaleDateString("en-GB")} →{" "}
                  {set.defaultHireEnd.toLocaleDateString("en-GB")}
                </span>
                .
              </>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {set.items.length > 0 ? (
            <div className="rounded-xl border border-driven-ink bg-driven-accent-light/40 px-4 py-3 text-right">
              <p className="font-[family-name:var(--font-driven-mono)] text-[10px] font-semibold uppercase tracking-wide text-driven-muted">
                Indicative set total
              </p>
              <p className="font-[family-name:var(--font-driven-display)] text-2xl font-semibold text-driven-ink">
                £{(totalIndicative / 100).toFixed(2)}
              </p>
              <p className="mt-0.5 text-xs text-driven-muted">
                {set.items.length} line{set.items.length === 1 ? "" : "s"} · pro-rata daily from weekly rate, min
                charge per yard rules (ex-VAT)
              </p>
            </div>
          ) : null}
          <Link
            href={`/prop-yard/search?setId=${encodeURIComponent(set.id)}`}
            className="inline-flex items-center justify-center rounded-lg border border-driven-ink bg-driven-ink px-4 py-2 font-[family-name:var(--font-driven-mono)] text-xs font-semibold uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
          >
            Find props for this set
          </Link>
        </div>
      </div>

      <div className="mt-6 flex max-w-2xl flex-col gap-6">
        <form action={updatePropRentalSetNameAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="setId" value={set.id} />
          <div className="min-w-[10rem] flex-1">
            <label className="block text-xs text-driven-muted">Rename set</label>
            <input
              name="name"
              defaultValue={set.name}
              className="mt-1 w-full rounded-lg border border-driven-warm px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-driven-warm px-3 py-2 text-xs font-medium text-driven-ink hover:border-driven-ink"
          >
            Save name
          </button>
        </form>

        <form action={updatePropRentalSetHireWindowAction} className="rounded-xl border border-driven-warm bg-white p-4">
          <input type="hidden" name="setId" value={set.id} />
          <p className="text-xs font-medium text-driven-ink">Default hire window (optional)</p>
          <p className="mt-1 text-[11px] text-driven-muted">
            When you add a prop to this set, start and end dates prefill from here. Leave both blank and save to clear.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-driven-muted">Default start</label>
              <input
                type="date"
                name="defaultHireStart"
                defaultValue={
                  set.defaultHireStart && set.defaultHireEnd
                    ? utcCalendarDateToIso(set.defaultHireStart)
                    : ""
                }
                className="mt-1 rounded-lg border border-driven-warm px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-driven-muted">Default end (inclusive)</label>
              <input
                type="date"
                name="defaultHireEnd"
                defaultValue={
                  set.defaultHireStart && set.defaultHireEnd
                    ? utcCalendarDateToIso(set.defaultHireEnd)
                    : ""
                }
                className="mt-1 rounded-lg border border-driven-warm px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg border border-driven-ink bg-driven-ink px-3 py-2 text-xs font-semibold text-driven-paper hover:bg-driven-accent"
            >
              Save window
            </button>
          </div>
        </form>
      </div>

      {error ? (
        <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(error)}</p>
      ) : null}

      {set.items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-driven-warm bg-white p-8 text-center">
          <p className="text-sm text-driven-muted">This set is empty.</p>
          <Link
            href={`/prop-yard/search?setId=${encodeURIComponent(set.id)}`}
            className="mt-4 inline-block text-sm font-medium text-driven-accent underline"
          >
            Search props to add
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-8 space-y-4">
            {itemRows.map(({ item, billableWeeks, linePence, runningPence }) => {
              const thumb = item.offer.listing.images[0];
              return (
              <li key={item.id} className="rounded-xl border border-driven-warm bg-white p-4">
                <div className="flex flex-wrap items-start gap-4">
                  <Link
                    href={`/prop-yard/offers/${item.offer.id}?setId=${encodeURIComponent(set.id)}`}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-driven-warm bg-driven-warm outline-none ring-driven-accent transition hover:ring-2 focus-visible:ring-2"
                    aria-label={`View ${item.offer.listing.title}`}
                  >
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt={item.offer.listing.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-[family-name:var(--font-driven-mono)] text-[10px] uppercase text-driven-muted">
                        No photo
                      </span>
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-driven-ink">{item.offer.listing.title}</p>
                    <p className="text-xs text-driven-muted">
                      {item.offer.listing.seller.sellerProfile?.displayName ?? "Yard"} · £
                      {(item.offer.weeklyHirePence / 100).toFixed(2)}/week · min{" "}
                      {item.offer.minimumHireWeeks} week{item.offer.minimumHireWeeks === 1 ? "" : "s"}
                    </p>
                    <p className="mt-1 text-sm text-driven-muted">
                      {item.hireStart.toLocaleDateString("en-GB")} → {item.hireEnd.toLocaleDateString("en-GB")} ·{" "}
                      <span className="text-driven-ink">
                        {billableWeeks} billable week{billableWeeks === 1 ? "" : "s"}
                      </span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-driven-warm pt-2 font-[family-name:var(--font-driven-mono)] text-xs text-driven-ink">
                      <span>
                        Line: <strong>£{(linePence / 100).toFixed(2)}</strong>
                      </span>
                      <span className="text-driven-muted">
                        Running total: <strong className="text-driven-ink">£{(runningPence / 100).toFixed(2)}</strong>
                      </span>
                    </div>
                  </div>
                  <form action={removePropSetItemAction} className="shrink-0">
                    <input type="hidden" name="setId" value={set.id} />
                    <input type="hidden" name="setItemId" value={item.id} />
                    <button className="rounded-lg border border-driven-warm px-3 py-1.5 text-xs text-driven-ink hover:bg-driven-accent-light/50">
                      Remove from set
                    </button>
                  </form>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>

          <div className="mt-8 rounded-xl border border-driven-warm bg-white p-5">
            <p className="text-sm text-driven-muted">
              {set.items.length} prop request{set.items.length === 1 ? "" : "s"} across {groupedYards} yard
              {groupedYards === 1 ? "" : "s"} · Indicative combined hire{" "}
              <strong className="text-driven-ink">£{(totalIndicative / 100).toFixed(2)}</strong> (same running total as
              above)
            </p>
            <form action={submitPropSetRequestsAction} className="mt-4 space-y-3">
              <input type="hidden" name="setId" value={set.id} />
              <label className="flex gap-2 text-xs text-driven-muted">
                <input type="checkbox" name="contractAccepted" value="on" required className="mt-0.5" />
                <span>
                  I accept Prop Yard terms (v{PROP_YARD_TERMS_VERSION}). Hire charges are paid securely through Stripe
                  on the next screen — one checkout per supplier, same Connect flow as marketplace purchases.
                </span>
              </label>
              <button
                type="submit"
                className="rounded-lg border border-driven-ink bg-driven-ink px-4 py-2 font-[family-name:var(--font-driven-mono)] text-xs font-semibold uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
              >
                Send grouped hire requests
              </button>
            </form>
          </div>

          {batchesOrdered.length > 0 ? (
            <section className="mt-10 rounded-xl border border-driven-warm bg-white p-5">
              <h2 className="font-[family-name:var(--font-driven-mono)] text-[10px] font-semibold uppercase tracking-wide text-driven-muted">
                Sent from this set
              </h2>
              <ul className="mt-3 space-y-3 text-sm">
                {batchesOrdered.map((batch) => {
                  const yardNames = [
                    ...new Map(
                      batch.rows.map((r) => [
                        r.offer.listing.sellerId,
                        r.offer.listing.seller.sellerProfile?.displayName ?? "Yard",
                      ])
                    ).values(),
                  ];
                  const allPaid = batch.rows.every((r) => r.hirePaidAt);
                  return (
                    <li key={batch.batchId} className="rounded-lg border border-driven-warm bg-driven-paper px-3 py-2">
                      <p className="font-medium text-driven-ink">
                        {batch.createdAt.toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <p className="text-xs text-driven-muted">
                        To: {yardNames.join(" · ")} · {batch.rows.length} line
                        {batch.rows.length === 1 ? "" : "s"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {allPaid ? (
                          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Paid</span>
                        ) : (
                          <Link
                            href={`/prop-yard/hires/success?batchId=${encodeURIComponent(batch.batchId)}&setId=${encodeURIComponent(set.id)}`}
                            className="text-xs font-semibold uppercase tracking-wide text-driven-accent underline hover:text-driven-ink"
                          >
                            Pay on platform →
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
