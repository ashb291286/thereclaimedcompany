import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  removePropBasketItemAction,
  submitPropBasketRequestsAction,
} from "@/lib/actions/prop-yard";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function PropYardBasketPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/prop-yard/basket");
  const { error } = await searchParams;

  const items = await prisma.propRentalBasketItem.findMany({
    where: { userId: session.user.id },
    include: {
      offer: {
        include: {
          listing: {
            include: { seller: { include: { sellerProfile: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const groupedYards = new Set(items.map((x) => x.offer.listing.sellerId)).size;
  const totalIndicative = items.reduce((sum, x) => {
    const days =
      Math.floor(
        (x.hireEnd.getTime() - x.hireStart.getTime()) / (24 * 60 * 60 * 1000)
      ) + 1;
    const weeks = Math.max(1, Math.ceil(days / 7));
    return sum + weeks * x.offer.weeklyHirePence;
  }, 0);

  return (
    <div>
      <h2 className="font-[family-name:var(--font-driven-display)] text-2xl font-semibold text-driven-ink">
        Prop request basket
      </h2>
      <p className="mt-2 text-sm text-driven-muted">
        Build one basket across many props. On submit, requests are grouped and sent to each yard separately.
      </p>
      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{decodeURIComponent(error)}</p>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-driven-warm bg-white p-8 text-center">
          <p className="text-sm text-driven-muted">No props in your basket yet.</p>
          <Link
            href="/prop-yard/search"
            className="mt-4 inline-block text-sm font-medium text-driven-accent underline hover:text-driven-ink"
          >
            Browse props
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-8 space-y-4">
            {items.map((item) => (
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
                      {item.hireStart.toLocaleDateString("en-GB")} →{" "}
                      {item.hireEnd.toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <form action={removePropBasketItemAction}>
                    <input type="hidden" name="basketItemId" value={item.id} />
                    <button className="rounded-lg border border-driven-warm px-3 py-1.5 text-xs text-driven-ink hover:bg-driven-accent-light/50">
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-xl border border-driven-warm bg-white p-5">
            <p className="text-sm text-driven-muted">
              {items.length} prop request{items.length === 1 ? "" : "s"} across {groupedYards} yard
              {groupedYards === 1 ? "" : "s"} · Indicative weekly-total quote £
              {(totalIndicative / 100).toFixed(2)}
            </p>
            <form action={submitPropBasketRequestsAction} className="mt-4 space-y-3">
              <label className="flex gap-2 text-xs text-driven-muted">
                <input type="checkbox" name="contractAccepted" value="on" required className="mt-0.5" />
                <span>
                  I accept Prop Yard terms: requests are grouped by yard; final contract/payment/deposit is
                  agreed directly with each yard.
                </span>
              </label>
              <button
                type="submit"
                className="rounded-lg border border-driven-ink bg-driven-ink px-4 py-2 font-[family-name:var(--font-driven-mono)] text-xs font-semibold uppercase tracking-wide text-driven-paper hover:bg-driven-accent"
              >
                Send grouped requests
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
