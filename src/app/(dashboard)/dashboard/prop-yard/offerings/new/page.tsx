import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createPropRentalOfferAction } from "@/lib/actions/prop-yard";
import { suggestedWeeklyHirePence, PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE } from "@/lib/prop-yard";

type Props = { searchParams: Promise<{ error?: string; listingId?: string }> };

export default async function NewPropRentalOfferingPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "reclamation_yard") {
    redirect("/dashboard");
  }

  const { error, listingId: listingIdPrefill } = await searchParams;

  const listings = await prisma.listing.findMany({
    where: {
      sellerId: session.user.id,
      status: "active",
      listingKind: "sell",
      freeToCollector: false,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      price: true,
      propRentalOffer: { select: { id: true, minimumHireWeeks: true, weeklyHirePence: true } },
    },
  });

  const pct = Math.round(PROP_YARD_RECOMMENDED_WEEKLY_RATE_OF_LIST_PRICE * 100);

  return (
    <div>
      <Link href="/dashboard/prop-yard" className="text-sm text-brand hover:underline">
        ← Prop Yard dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900">Add listing for hire</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Pick an <strong>active fixed-price</strong> listing. Default weekly hire is <strong>{pct}%</strong> of your
        current list price — edit before saving. One Prop Yard offer per listing (updates replace the previous).
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(error)}</p>
      ) : null}

      {listings.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-600">
          You need at least one active buy-now listing.{" "}
          <Link href="/dashboard/sell" className="font-medium text-brand underline">
            List an item
          </Link>{" "}
          first.
        </p>
      ) : (
        <ul className="mt-8 space-y-6">
          {listings.map((l) => {
            const suggested = suggestedWeeklyHirePence(l.price);
            const gbp = (suggested / 100).toFixed(2);
            const has = !!l.propRentalOffer;
            const defaultMin = l.propRentalOffer?.minimumHireWeeks ?? 1;
            const defaultWeekly = l.propRentalOffer?.weeklyHirePence
              ? (l.propRentalOffer.weeklyHirePence / 100).toFixed(2)
              : gbp;
            return (
              <li
                key={l.id}
                className={`rounded-xl border p-5 ${
                  listingIdPrefill && listingIdPrefill === l.id
                    ? "border-amber-300 bg-amber-50/70"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <p className="font-medium text-zinc-900">{l.title}</p>
                <p className="text-xs text-zinc-500">List price £{(l.price / 100).toFixed(2)}</p>
                <form action={createPropRentalOfferAction} className="mt-4 space-y-3">
                  <input type="hidden" name="listingId" value={l.id} />
                  <div>
                    <label className="block text-xs font-medium text-zinc-700">Weekly hire (£)</label>
                    <input
                      name="weeklyHireGbp"
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      defaultValue={defaultWeekly}
                      className="mt-1 max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-xs text-zinc-500">Suggested from {pct}% rule: £{gbp}/week</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700">Minimum hire (weeks)</label>
                    <input
                      name="minimumHireWeeks"
                      type="number"
                      min="1"
                      max="52"
                      step="1"
                      required
                      defaultValue={defaultMin}
                      className="mt-1 max-w-xs rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700">
                      Notes for hirers (collection, deposit, condition — optional)
                    </label>
                    <textarea
                      name="yardHireNotes"
                      rows={3}
                      className="mt-1 w-full max-w-xl rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      placeholder="e.g. Collection from yard only; refundable deposit required; not suitable for exterior rain scenes…"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-950"
                  >
                    {has ? "Update Prop Yard offer" : "Publish to Prop Yard"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
