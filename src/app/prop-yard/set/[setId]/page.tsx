import Link from "next/link";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  removePropSetItemAction,
  submitPropSetRequestsAction,
  updatePropRentalSetNameAction,
} from "@/lib/actions/prop-yard";

type Props = { params: Promise<{ setId: string }>; searchParams: Promise<{ error?: string }> };

export default async function PropYardSetBuilderPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/prop-yard/sets");
  const { setId } = await params;
  const { error } = await searchParams;

  const set = await prisma.propRentalSet.findFirst({
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
  });
  if (!set) notFound();

  const groupedYards = new Set(set.items.map((x) => x.offer.listing.sellerId)).size;
  const totalIndicative = set.items.reduce((sum, x) => {
    const days =
      Math.floor(
        (x.hireEnd.getTime() - x.hireStart.getTime()) / (24 * 60 * 60 * 1000)
      ) + 1;
    const weeks = Math.max(1, Math.ceil(days / 7));
    return sum + weeks * x.offer.weeklyHirePence;
  }, 0);

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
            Add props from search, then send hire requests — one action per yard.
          </p>
        </div>
        <Link
          href={`/prop-yard/search?setId=${encodeURIComponent(set.id)}`}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-driven-ink bg-driven-ink px-4 py-2 font-[family-name:var(--font-driven-mono)] text-xs font-semibold uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
        >
          Find props for this set
        </Link>
      </div>

      <form action={updatePropRentalSetNameAction} className="mt-6 flex max-w-lg flex-wrap items-end gap-2">
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
            {set.items.map((item) => (
              <li key={item.id} className="rounded-xl border border-driven-warm bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-driven-ink">{item.offer.listing.title}</p>
                    <p className="text-xs text-driven-muted">
                      {item.offer.listing.seller.sellerProfile?.displayName ?? "Yard"} · £
                      {(item.offer.weeklyHirePence / 100).toFixed(2)}/week · min{" "}
                      {item.offer.minimumHireWeeks} week{item.offer.minimumHireWeeks === 1 ? "" : "s"}
                    </p>
                    <p className="mt-1 text-sm text-driven-muted">
                      {item.hireStart.toLocaleDateString("en-GB")} → {item.hireEnd.toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <form action={removePropSetItemAction}>
                    <input type="hidden" name="setId" value={set.id} />
                    <input type="hidden" name="setItemId" value={item.id} />
                    <button className="rounded-lg border border-driven-warm px-3 py-1.5 text-xs text-driven-ink hover:bg-driven-accent-light/50">
                      Remove from set
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-xl border border-driven-warm bg-white p-5">
            <p className="text-sm text-driven-muted">
              {set.items.length} prop request{set.items.length === 1 ? "" : "s"} across {groupedYards} yard
              {groupedYards === 1 ? "" : "s"} · Indicative weekly-total quote £
              {(totalIndicative / 100).toFixed(2)}
            </p>
            <form action={submitPropSetRequestsAction} className="mt-4 space-y-3">
              <input type="hidden" name="setId" value={set.id} />
              <label className="flex gap-2 text-xs text-driven-muted">
                <input type="checkbox" name="contractAccepted" value="on" required className="mt-0.5" />
                <span>
                  I accept Prop Yard terms: requests are grouped by yard; final contract/payment/deposit is agreed
                  directly with each yard.
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
        </>
      )}
    </div>
  );
}
