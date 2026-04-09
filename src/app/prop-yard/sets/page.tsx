import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createPropRentalSetAction, deletePropRentalSetAction } from "@/lib/actions/prop-yard";
import { computePropHireTotalPence } from "@/lib/prop-yard";
import { labelForPropSetProductionType, PROP_SET_PRODUCTION_OPTIONS } from "@/lib/prop-yard-set-production";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function PropYardSetsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/prop-yard/sets");
  const { error } = await searchParams;

  const sets = await prisma.propRentalSet.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { items: true } },
      items: {
        select: {
          hireStart: true,
          hireEnd: true,
          offer: { select: { weeklyHirePence: true, minimumHireWeeks: true } },
        },
      },
    },
  });

  return (
    <div>
      <h1 className="font-[family-name:var(--font-driven-display)] text-2xl font-semibold text-driven-ink">
        Your sets
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-driven-muted">
        Create a set for a scene, production, or mood board — optionally set a default hire window so every prop you
        add picks up the same dates (you can still edit per line). When you send requests, we group them by yard. Lines
        stay in the set after sending so you can pay and add more.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(error)}</p>
      ) : null}

      <form action={createPropRentalSetAction} className="mt-8 max-w-xl space-y-4 rounded-xl border border-driven-warm bg-white p-4">
        <div>
          <label htmlFor="new-set-name" className="block text-xs font-medium text-driven-ink">
            New set name
          </label>
          <input
            id="new-set-name"
            name="name"
            placeholder="e.g. Kitchen scene — 1970s"
            className="mt-1 w-full rounded-lg border border-driven-warm bg-white px-3 py-2 text-sm text-driven-ink"
          />
        </div>
        <div>
          <label htmlFor="new-set-production-type" className="block text-xs font-medium text-driven-ink">
            Production type
          </label>
          <select
            id="new-set-production-type"
            name="productionType"
            required
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-driven-warm bg-white px-3 py-2 text-sm text-driven-ink"
          >
            <option value="" disabled>
              Select production type…
            </option>
            {PROP_SET_PRODUCTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="new-set-hire-start" className="block text-xs font-medium text-driven-ink">
              Default hire start <span className="font-normal text-driven-muted">(optional)</span>
            </label>
            <input
              id="new-set-hire-start"
              type="date"
              name="defaultHireStart"
              className="mt-1 rounded-lg border border-driven-warm px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="new-set-hire-end" className="block text-xs font-medium text-driven-ink">
              Default hire end <span className="font-normal text-driven-muted">(inclusive, optional)</span>
            </label>
            <input
              id="new-set-hire-end"
              type="date"
              name="defaultHireEnd"
              className="mt-1 rounded-lg border border-driven-warm px-3 py-2 text-sm"
            />
          </div>
        </div>
        <p className="text-[11px] text-driven-muted">
          If you use default dates, fill both fields — they auto-fill when you add props to this set.
        </p>
        <button
          type="submit"
          className="rounded-lg border border-driven-ink bg-driven-ink px-4 py-2 font-[family-name:var(--font-driven-mono)] text-xs font-semibold uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
        >
          Create &amp; open builder
        </button>
      </form>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-driven-mono)] text-[10px] font-semibold uppercase tracking-wide text-driven-muted">
          Open sets
        </h2>
        {sets.length === 0 ? (
          <p className="mt-4 text-sm text-driven-muted">No sets yet — name one above to start building.</p>
        ) : (
          <ul className="mt-4 divide-y divide-driven-warm border border-driven-warm bg-white">
            {sets.map((s) => {
              const indicativePence = s.items.reduce(
                (sum, it) =>
                  sum +
                  computePropHireTotalPence(
                    it.hireStart,
                    it.hireEnd,
                    it.offer.minimumHireWeeks,
                    it.offer.weeklyHirePence
                  ),
                0
              );
              return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <div>
                  <Link
                    href={`/prop-yard/set/${s.id}`}
                    className="font-medium text-driven-ink hover:text-driven-accent hover:underline"
                  >
                    {s.name}
                  </Link>
                  <p className="mt-1 text-xs text-driven-muted">
                    {labelForPropSetProductionType(s.productionType) ? (
                      <>
                        <span className="font-medium text-driven-ink">
                          {labelForPropSetProductionType(s.productionType)}
                        </span>
                        {" · "}
                      </>
                    ) : null}
                    {s._count.items} prop{s._count.items === 1 ? "" : "s"}
                    {s._count.items > 0 ? (
                      <>
                        {" "}
                        · indicative <span className="font-medium text-driven-ink">£{(indicativePence / 100).toFixed(2)}</span>
                      </>
                    ) : null}
                    {s.defaultHireStart && s.defaultHireEnd ? (
                      <>
                        {" "}
                        · default window {s.defaultHireStart.toLocaleDateString("en-GB")}–
                        {s.defaultHireEnd.toLocaleDateString("en-GB")}
                      </>
                    ) : null}{" "}
                    · updated {s.updatedAt.toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/prop-yard/search?setId=${encodeURIComponent(s.id)}`}
                    className="rounded-lg border border-driven-warm px-3 py-1.5 text-xs font-medium text-driven-ink hover:border-driven-ink"
                  >
                    Find props
                  </Link>
                  <Link
                    href={`/prop-yard/set/${s.id}`}
                    className="rounded-lg border border-driven-ink bg-driven-ink px-3 py-1.5 text-xs font-semibold text-driven-paper hover:bg-driven-accent"
                  >
                    Open set builder
                  </Link>
                  <form action={deletePropRentalSetAction} className="inline">
                    <input type="hidden" name="setId" value={s.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
