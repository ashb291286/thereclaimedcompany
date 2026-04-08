import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createPropRentalSetAction, deletePropRentalSetAction } from "@/lib/actions/prop-yard";
import { billableWeeksFromRange } from "@/lib/prop-yard";

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
          offer: { select: { weeklyHirePence: true } },
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
        Create a set for a scene, production, or mood board — then search props and add hire details here. When you
        send requests, we group them by yard the same as before.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(error)}</p>
      ) : null}

      <form action={createPropRentalSetAction} className="mt-8 flex max-w-xl flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
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
              const indicativePence = s.items.reduce((sum, it) => {
                const w = billableWeeksFromRange(it.hireStart, it.hireEnd);
                return sum + w * it.offer.weeklyHirePence;
              }, 0);
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
                    {s._count.items} prop{s._count.items === 1 ? "" : "s"}
                    {s._count.items > 0 ? (
                      <>
                        {" "}
                        · indicative <span className="font-medium text-driven-ink">£{(indicativePence / 100).toFixed(2)}</span>
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
